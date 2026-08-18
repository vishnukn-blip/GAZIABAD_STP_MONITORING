import os
import time
import logging
import requests
import numpy as np
import cv2
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── Configuration ─────────────────────────────────────────────────────────────
REMOTE_API_BASE = os.environ.get(
    'REMOTE_API_BASE',
    'http://127.0.0.1:5000/api/5grouter'
)

# Matching threshold. Portrait→ceiling-angle causes large embedding distance.
# Raised to 0.42 — avoids false matches (31–32% scores on objects/hands).
# Tune higher (0.45+) if you still see wrong identifications.
THRESHOLD_SIMILARITY = 0.42

# Minimum detection confidence for a face to be kept.
# Lowered to 0.45 to capture tilted, side-angle, or small faces.
MIN_DET_SCORE = 0.45

# Minimum face bounding box area as a fraction of the full image.
# Lowered to 0.0005 (0.05% of image area) to ensure small/distant faces are detected.
MIN_FACE_AREA_FRACTION = 0.0005   # 0.05 % of image

# ── In-memory face database ───────────────────────────────────────────────────
# Each person entry: {
#   "id": int,
#   "name": str,
#   "role": str,
#   "embeddings": [np.ndarray, ...],   ← list of all reference embeddings
#   "registered_at": str
# }
PERSON_DB = []

# Detection event history
DETECTION_LOG = []

# ── InsightFace Model Init ────────────────────────────────────────────────────
logger.info("Initializing InsightFace model (buffalo_s)...")
try:
    from insightface.app import FaceAnalysis
    face_app = FaceAnalysis(name='buffalo_s', root='~/.insightface', providers=['CPUExecutionProvider'])
    # det_thresh=0.30 — lowered from 0.45 to detect small, tilted, or distant faces.
    face_app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.30)
    logger.info("InsightFace initialized successfully (det_thresh=0.30)!")
except Exception as e:
    logger.error(f"Failed to initialize InsightFace: {e}")
    face_app = None

# ── Helper: Cosine Similarity ─────────────────────────────────────────────────
def cosine_sim(emb1, emb2):
    """Return cosine similarity in [-1, 1] between two embedding vectors."""
    if emb1 is None or emb2 is None:
        return 0.0
    n1 = np.linalg.norm(emb1)
    n2 = np.linalg.norm(emb2)
    if n1 == 0 or n2 == 0:
        return 0.0
    return float(np.dot(emb1, emb2) / (n1 * n2))

# ── Helper: DB Persistence ───────────────────────────────────────────────────
DB_PATH = 'known_faces/person_db.pkl'

def save_db():
    try:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with open(DB_PATH, 'wb') as f:
            import pickle
            pickle.dump(PERSON_DB, f)
        logger.info(f"Database saved successfully: {len(PERSON_DB)} person(s)")
    except Exception as e:
        logger.error(f"Failed to save database: {e}")

def load_db():
    global PERSON_DB
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, 'rb') as f:
                import pickle
                PERSON_DB = pickle.load(f)
            logger.info(f"Database loaded successfully: {len(PERSON_DB)} person(s) found.")
            return True
        except Exception as e:
            logger.error(f"Failed to load database: {e}")
    return False

def best_similarity(query_emb, person):
    """
    Compare query_emb against ALL stored embeddings for a person.
    Returns the MAXIMUM similarity across all their reference photos.
    This is crucial — matching any one of their stored photos is sufficient.
    """
    sims = [cosine_sim(query_emb, ref) for ref in person["embeddings"]]
    return max(sims) if sims else 0.0

def find_or_create_person(name, role):
    """Return existing person by name (case-insensitive) or create new."""
    for p in PERSON_DB:
        if p["name"].lower() == name.lower():
            return p
    max_id = max([p["id"] for p in PERSON_DB]) if PERSON_DB else 0
    new_id = max_id + 1
    person = {
        "id": new_id,
        "name": name,
        "role": role,
        "embeddings": [],
        "registered_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    PERSON_DB.append(person)
    save_db()
    return person

# ── Helper: IoU and Multi-Orientation Face Detection ──────────────────────────
def bbox_iou(boxA, boxB):
    """Calculate Intersection over Union (IoU) between two bounding boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    iou = interArea / float(boxAArea + boxBArea - interArea) if (boxAArea + boxBArea - interArea) > 0 else 0.0
    return iou

def filter_faces(faces, img_h, img_w):
    """
    Post-detection filter. Removes faces that are:
      1. Below MIN_DET_SCORE confidence (weak/false detections on objects).
      2. Smaller than MIN_FACE_AREA_FRACTION of the image (tiny artifacts).
    """
    img_area = img_h * img_w
    kept = []
    for face in faces:
        det_score = float(face.det_score)
        bbox = face.bbox
        face_area = max(0, bbox[2] - bbox[0]) * max(0, bbox[3] - bbox[1])
        area_frac = face_area / img_area if img_area > 0 else 0

        if det_score < MIN_DET_SCORE:
            logger.info(f"  → Dropped face: det_score={det_score:.3f} < {MIN_DET_SCORE} (too weak)")
            continue
        if area_frac < MIN_FACE_AREA_FRACTION:
            logger.info(f"  → Dropped face: area_frac={area_frac:.4f} < {MIN_FACE_AREA_FRACTION} (too small)")
            continue
        kept.append(face)
    return kept

def nms_faces(faces, iou_threshold=0.40):
    """
    Non-Maximum Suppression: removes duplicate bounding boxes.
    Keeps the face with the highest det_score when two boxes overlap > iou_threshold.
    """
    if len(faces) <= 1:
        return faces
    faces_sorted = sorted(faces, key=lambda f: float(f.det_score), reverse=True)
    kept = []
    suppressed = set()
    for i, fa in enumerate(faces_sorted):
        if i in suppressed:
            continue
        kept.append(fa)
        for j, fb in enumerate(faces_sorted):
            if j <= i or j in suppressed:
                continue
            if bbox_iou(fa.bbox, fb.bbox) > iou_threshold:
                suppressed.add(j)
                logger.info(f"  → NMS suppressed duplicate face (IoU={bbox_iou(fa.bbox, fb.bbox):.2f})")
    return kept

def get_faces_multi_orientation(img_cv):
    """
    Runs face detection on the image in 4 orientations:
    1. Original (0 degrees)
    2. 90-degree clockwise (cv2.ROTATE_90_CLOCKWISE)
    3. 180-degree (cv2.ROTATE_180)
    4. 270-degree / 90-degree counter-clockwise (cv2.ROTATE_90_COUNTERCLOCKWISE)
    This guarantees we detect faces no matter how the camera is physically mounted.
    Coordinates are remapped back to original image space and duplicate detections
    are merged via NMS.
    """
    if face_app is None:
        return []

    H, W, _ = img_cv.shape
    all_raw_faces = []

    # 1. Detect on original (0 deg)
    faces_0 = face_app.get(img_cv)
    logger.info(f"Multi-orientation: detected {len(faces_0)} face(s) in original image.")
    for f in faces_0:
        xmin, ymin, xmax, ymax = f.bbox
        f.bbox = np.array([
            max(0.0, float(xmin)),
            max(0.0, float(ymin)),
            min(float(W), float(xmax)),
            min(float(H), float(ymax))
        ], dtype=np.float32)
        all_raw_faces.append(f)

    # 2. Detect on 90 degrees clockwise
    img_90 = cv2.rotate(img_cv, cv2.ROTATE_90_CLOCKWISE)
    faces_90 = face_app.get(img_90)
    logger.info(f"Multi-orientation: detected {len(faces_90)} face(s) in 90-deg CW rotated image.")
    for f in faces_90:
        xmin_r, ymin_r, xmax_r, ymax_r = f.bbox
        xmin = ymin_r
        ymin = H - xmax_r
        xmax = ymax_r
        ymax = H - xmin_r
        f.bbox = np.array([
            max(0.0, float(xmin)),
            max(0.0, float(ymin)),
            min(float(W), float(xmax)),
            min(float(H), float(ymax))
        ], dtype=np.float32)
        all_raw_faces.append(f)

    # 3. Detect on 180 degrees
    img_180 = cv2.rotate(img_cv, cv2.ROTATE_180)
    faces_180 = face_app.get(img_180)
    logger.info(f"Multi-orientation: detected {len(faces_180)} face(s) in 180-deg rotated image.")
    for f in faces_180:
        xmin_r, ymin_r, xmax_r, ymax_r = f.bbox
        xmin = W - xmax_r
        ymin = H - ymax_r
        xmax = W - xmin_r
        ymax = H - ymin_r
        f.bbox = np.array([
            max(0.0, float(xmin)),
            max(0.0, float(ymin)),
            min(float(W), float(xmax)),
            min(float(H), float(ymax))
        ], dtype=np.float32)
        all_raw_faces.append(f)

    # 4. Detect on 270 degrees (90 degrees counter-clockwise)
    img_270 = cv2.rotate(img_cv, cv2.ROTATE_90_COUNTERCLOCKWISE)
    faces_270 = face_app.get(img_270)
    logger.info(f"Multi-orientation: detected {len(faces_270)} face(s) in 90-deg CCW rotated image.")
    for f in faces_270:
        xmin_r, ymin_r, xmax_r, ymax_r = f.bbox
        xmin = W - ymax_r
        ymin = xmin_r
        xmax = W - ymin_r
        ymax = xmax_r
        f.bbox = np.array([
            max(0.0, float(xmin)),
            max(0.0, float(ymin)),
            min(float(W), float(xmax)),
            min(float(H), float(ymax))
        ], dtype=np.float32)
        all_raw_faces.append(f)

    # 5. Quality filter: remove weak detections and tiny artifacts
    filtered = filter_faces(all_raw_faces, H, W)
    logger.info(f"After quality filter: {len(all_raw_faces)} → {len(filtered)} face(s)")

    # 6. NMS: remove duplicate overlapping bounding boxes across different rotations
    final = nms_faces(filtered, iou_threshold=0.35)
    logger.info(f"After NMS: {len(filtered)} → {len(final)} face(s)")

    return final

# ── Bootstrap: Auto-register from camera snapshot ────────────────────────────
def bootstrap_known_faces():
    """
    Scan recent snapshots starting with 16_01_50 to find a frame
    with 1+ faces and seed the database with ONLY shivayogi.
    """
    if face_app is None:
        logger.warning("InsightFace not loaded — skipping bootstrap.")
        return

    logger.info("Bootstrap: scanning snapshots for initial face registration...")
    try:
        res = requests.get(f"{REMOTE_API_BASE}/list?source=5grouter", timeout=10)
        if res.status_code != 200:
            logger.error(f"Failed to fetch image list: {res.status_code}")
            return

        images = res.json()
        logger.info(f"Bootstrap: {len(images)} images available.")

        # Prioritise the known people image, then scan up to 30 recent frames
        candidates = sorted(images, key=lambda p: ('16_01_50' not in p))[:30]

        for path in candidates:
            try:
                img_res = requests.get(f"{REMOTE_API_BASE}/view/{path}?source=5grouter", timeout=15)
                if img_res.status_code != 200:
                    continue
                arr = np.asarray(bytearray(img_res.content), dtype=np.uint8)
                img_cv = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if img_cv is None:
                    continue

                faces = get_faces_multi_orientation(img_cv)
                logger.info(f"  {path} → {len(faces)} faces")

                if len(faces) >= 1:
                    # Sort faces vertically (by ymin) so the top face (index 0) is shivayogi on the laptop
                    sorted_faces = sorted(faces, key=lambda f: f.bbox[1])
                    shivayogi_face = sorted_faces[0]
                    
                    person = find_or_create_person("shivayogi", "Operator")
                    person["embeddings"] = [shivayogi_face.embedding]
                    logger.info("  Bootstrap registered: shivayogi (Operator)")
                    save_db()
                    return

            except Exception as ex:
                logger.warning(f"  Error on {path}: {ex}")

        logger.warning("Bootstrap: no frame with faces found. Database is empty.")

    except Exception as e:
        logger.error(f"Bootstrap failed: {e}")

def get_folder_paths(source):
    if source in ['cam2', 'cam2images']:
        return [
            "/home/routeruser/cam2images",
            "/home/ubuntu/cam2images",
            "/app/cam2images",
            "./cam2images"
        ]
    else:
        return [
            "/home/routeruser/5grouter_images",
            "/home/ubuntu/5grouter_images",
            "/app/5grouter_images",
            "./5grouter_images"
        ]

# ── Image List & View Routes (With Direct Local Directory Fallback) ─────────────
@app.route('/api/5grouter/list', methods=['GET'])
def list_images():
    source = request.args.get('source', '5grouter')
    if REMOTE_API_BASE and '5002' not in REMOTE_API_BASE:
        try:
            res = requests.get(f"{REMOTE_API_BASE}/list?source={source}", timeout=3)
            if res.status_code == 200:
                return res.content, res.status_code, {'Content-Type': 'application/json'}
        except Exception:
            pass

    folder_paths = get_folder_paths(source)
    target_dir = next((p for p in folder_paths if os.path.exists(p)), None)
    if not target_dir:
        return jsonify([]), 200

    try:
        image_files = []
        for root, _, files in os.walk(target_dir):
            for f in files:
                if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                    rel_path = os.path.relpath(os.path.join(root, f), target_dir)
                    image_files.append(rel_path.replace('\\', '/'))
        image_files = sorted(image_files, reverse=True)
        return jsonify(image_files), 200
    except Exception as e:
        logger.error(f"Error listing local directory: {e}")
        return jsonify([]), 200

@app.route('/api/5grouter/view/<path:filename>', methods=['GET'])
def view_image(filename):
    source = request.args.get('source', '5grouter')
    if REMOTE_API_BASE and '5002' not in REMOTE_API_BASE:
        try:
            res = requests.get(f"{REMOTE_API_BASE}/view/{filename}?source={source}", stream=True, timeout=3)
            if res.status_code == 200:
                headers = {k: v for k, v in res.headers.items() if k.lower() in ['content-type', 'content-length']}
                return Response(res.iter_content(chunk_size=2048), status=res.status_code, headers=headers)
        except Exception:
            pass

    folder_paths = get_folder_paths(source)
    for p in folder_paths:
        file_path = os.path.join(p, filename)
        if os.path.exists(file_path):
            from flask import send_from_directory
            dir_name, base_file = os.path.split(file_path)
            return send_from_directory(dir_name, base_file)

    return jsonify({"error": f"Image not found for source {source}"}), 404

# ── Inference: Detect + Identify faces ───────────────────────────────────────
@app.route('/api/5grouter/inference', methods=['GET'])
def perform_inference():
    image_path = request.args.get('path')
    source = request.args.get('source', '5grouter')
    if not image_path:
        return jsonify({"error": "Missing image path"}), 400
    if face_app is None:
        return jsonify({
            "imagePath": image_path,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "detectedPersons": []
        }), 200

    try:
        img_cv = None
        if REMOTE_API_BASE and '5002' not in REMOTE_API_BASE:
            try:
                res = requests.get(f"{REMOTE_API_BASE}/view/{image_path}?source={source}", timeout=5)
                if res.status_code == 200:
                    arr = np.asarray(bytearray(res.content), dtype=np.uint8)
                    img_cv = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            except Exception:
                pass

        if img_cv is None:
            folder_paths = get_folder_paths(source)
            for p in folder_paths:
                file_path = os.path.join(p, image_path)
                if os.path.exists(file_path):
                    img_cv = cv2.imread(file_path)
                    if img_cv is not None:
                        break

        if img_cv is None:
            return jsonify({"error": f"Failed to load image {image_path}"}), 404

        h, w, _ = img_cv.shape
        faces = get_faces_multi_orientation(img_cv)

        detected_persons = []
        for i, face in enumerate(faces):
            best_person = None
            best_sim = -1.0

            # Compare against every person in the database
            for person in PERSON_DB:
                sim = best_similarity(face.embedding, person)
                logger.info(f"  Face {i+1} vs {person['name']}: similarity={sim:.4f}")
                if sim > best_sim:
                    best_sim = sim
                    best_person = person

            if best_sim >= THRESHOLD_SIMILARITY and best_person:
                name = best_person["name"]
                role = best_person["role"]
                confidence = best_sim
            else:
                name = "Unknown"
                role = "Unauthorized"
                confidence = float(face.det_score)
                logger.info(f"  Face {i+1}: best_sim={best_sim:.4f} < threshold={THRESHOLD_SIMILARITY} → Unknown")

            bbox = face.bbox
            det_person = {
                "id": i + 1,
                "name": name,
                "role": role,
                "confidence": round(confidence, 4),
                "best_sim": round(best_sim, 4),
                "box": {
                    "x": round(max(0.0, float(bbox[0]) / w * 100), 2),
                    "y": round(max(0.0, float(bbox[1]) / h * 100), 2),
                    "width": round(min(100.0, float(bbox[2] - bbox[0]) / w * 100), 2),
                    "height": round(min(100.0, float(bbox[3] - bbox[1]) / h * 100), 2)
                }
            }
            detected_persons.append(det_person)

            DETECTION_LOG.append({
                "timestamp": time.strftime("%H:%M:%S"),
                "date": time.strftime("%Y-%m-%d"),
                "image": image_path.split('/')[-1],
                "name": name,
                "role": role,
                "confidence": round(confidence, 4)
            })

        logger.info(f"Inference: {image_path} → {len(detected_persons)} face(s)")
        return jsonify({
            "imagePath": image_path,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "detectedPersons": detected_persons
        })

    except Exception as e:
        logger.error(f"Inference error: {e}")
        return jsonify({
            "imagePath": image_path,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "detectedPersons": []
        }), 200

# ── Register face from an existing camera snapshot ─────────────────────────────
@app.route('/api/5grouter/register-from-snapshot', methods=['POST'])
def register_from_snapshot():
    """
    Links a specific face detected in a camera snapshot to a named person.
    This is the KEY endpoint for handling the portrait → ceiling-angle domain gap.
    The user picks a snapshot image path + face index → system crops + registers that face.
    """
    if face_app is None:
        return jsonify({"error": "InsightFace model not loaded"}), 500

    data = request.get_json()
    name = (data.get('name') or '').strip()
    role = data.get('role', 'Operator')
    image_path = data.get('imagePath', '')
    face_index = int(data.get('faceIndex', 0))  # 0-based index of the face to link
    source = data.get('source', '5grouter')

    if not name or not image_path:
        return jsonify({"error": "name and imagePath are required"}), 400

    try:
        img_cv = None
        if REMOTE_API_BASE and '5002' not in REMOTE_API_BASE:
            try:
                res = requests.get(f"{REMOTE_API_BASE}/view/{image_path}?source={source}", timeout=5)
                if res.status_code == 200:
                    arr = np.asarray(bytearray(res.content), dtype=np.uint8)
                    img_cv = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            except Exception:
                pass

        if img_cv is None:
            folder_paths = get_folder_paths(source)
            for p in folder_paths:
                file_path = os.path.join(p, image_path)
                if os.path.exists(file_path):
                    img_cv = cv2.imread(file_path)
                    if img_cv is not None:
                        break

        if img_cv is None:
            return jsonify({"error": f"Failed to load snapshot image {image_path}"}), 400

        faces = get_faces_multi_orientation(img_cv)
        if not faces:
            return jsonify({"error": "No faces detected in the snapshot"}), 400
        if face_index >= len(faces):
            face_index = 0  # fallback to first face

        face = faces[face_index]
        person = find_or_create_person(name, role)
        person["embeddings"].append(face.embedding)
        person["role"] = role

        photo_count = len(person["embeddings"])
        logger.info(f"Registered {name} from snapshot {image_path} face #{face_index} — now {photo_count} refs")
        return jsonify({
            "message": f"Linked face #{face_index + 1} from camera snapshot to {name}. They now have {photo_count} reference(s).",
            "id": person["id"],
            "name": name,
            "role": role,
            "photo_count": photo_count
        })

    except Exception as e:
        logger.error(f"register-from-snapshot error: {e}")
        return jsonify({"error": str(e)}), 500

# ── Staff registry: GET ───────────────────────────────────────────────────────
@app.route('/api/5grouter/staff', methods=['GET'])
def get_staff():
    return jsonify([
        {
            "id": p["id"],
            "name": p["name"],
            "role": p["role"],
            "photo_count": len(p["embeddings"]),   # Show how many reference photos are stored
            "registered_at": p["registered_at"]
        }
        for p in PERSON_DB
    ])

# ── Register new face (or ADD ANOTHER PHOTO to an existing person) ─────────────
@app.route('/api/5grouter/register', methods=['POST'])
def register_staff():
    if face_app is None:
        return jsonify({"error": "InsightFace model not loaded"}), 500

    name = request.form.get('name', '').strip()
    role = request.form.get('role', 'Operator')
    file = request.files.get('image')

    if not name or not file:
        return jsonify({"error": "Name and image file are required"}), 400

    try:
        file_bytes = file.read()
        arr = np.asarray(bytearray(file_bytes), dtype=np.uint8)
        img_cv = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_cv is None:
            return jsonify({"error": "Failed to decode uploaded image"}), 400

        faces = face_app.get(img_cv)
        if len(faces) == 0:
            return jsonify({"error": "No face detected in the uploaded photo. Please use a clear, well-lit portrait."}), 400

        # Use the largest (closest) face in the photo
        best_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        # Find existing person or create new
        person = find_or_create_person(name, role)
        person["embeddings"].append(best_face.embedding)
        person["role"] = role  # Allow role updates

        photo_count = len(person["embeddings"])
        logger.info(f"Registered: {name} ({role}) — now has {photo_count} reference photo(s)")

        return jsonify({
            "message": f"Successfully registered {name} ({role}). They now have {photo_count} reference photo(s) — more photos = better accuracy!",
            "id": person["id"],
            "name": name,
            "role": role,
            "photo_count": photo_count
        })

    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({"error": str(e)}), 500

# ── Debug: Raw similarity scores for a given image ────────────────────────────
@app.route('/api/5grouter/debug-similarity', methods=['GET'])
def debug_similarity():
    """
    Returns raw cosine similarity of all detected faces vs all registered persons.
    Use this to tune the threshold or diagnose recognition failures.
    """
    image_path = request.args.get('path')
    source = request.args.get('source', '5grouter')
    if not image_path or face_app is None:
        return jsonify({"error": "Missing path or model not loaded"}), 400

    try:
        res = requests.get(f"{REMOTE_API_BASE}/view/{image_path}?source={source}", timeout=15)
        arr = np.asarray(bytearray(res.content), dtype=np.uint8)
        img_cv = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        faces = get_faces_multi_orientation(img_cv)

        results = []
        for i, face in enumerate(faces):
            scores = {}
            for person in PERSON_DB:
                scores[person["name"]] = {
                    "best_similarity": round(best_similarity(face.embedding, person), 4),
                    "num_reference_photos": len(person["embeddings"]),
                    "would_match": best_similarity(face.embedding, person) >= THRESHOLD_SIMILARITY
                }
            results.append({"face_index": i + 1, "det_score": round(float(face.det_score), 4), "scores": scores})

        return jsonify({
            "threshold": THRESHOLD_SIMILARITY,
            "total_faces_detected": len(faces),
            "faces": results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Detection history ─────────────────────────────────────────────────────────
@app.route('/api/5grouter/detections', methods=['GET'])
def get_detections():
    return jsonify(DETECTION_LOG[-50:][::-1])

# ── Delete staff member ───────────────────────────────────────────────────────
@app.route('/api/5grouter/staff/<int:person_id>', methods=['DELETE'])
def delete_staff(person_id):
    global PERSON_DB
    found = False
    new_db = []
    for p in PERSON_DB:
        if p["id"] == person_id:
            found = True
            logger.info(f"Deleting person: ID={person_id}, Name={p['name']}")
        else:
            new_db.append(p)
    
    if not found:
        return jsonify({"error": f"Person with ID {person_id} not found"}), 404
        
    PERSON_DB = new_db
    save_db()
    return jsonify({"message": "Successfully deleted staff profile."})

# ── Startup ───────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    with app.app_context():
        time.sleep(1.0)
        if not load_db():
            bootstrap_known_faces()
    app.run(host='0.0.0.0', port=5002)
