from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///./stp_monitoring.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")  # "admin" | "user"
    is_active = Column(Boolean, default=True)
    devices = relationship("Device", back_populates="owner", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_id = Column(String, nullable=False)
    api_key = Column(String, nullable=False)
    api_token = Column(String, nullable=False)
    device_name = Column(String, nullable=False)
    owner = relationship("User", back_populates="devices")
    tanks = relationship("Tank", back_populates="device", cascade="all, delete-orphan")


class Tank(Base):
    __tablename__ = "tanks"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    name = Column(String, nullable=False)
    variant = Column(String, default="main")  # "main" | "underground"
    capacity_liters = Column(Integer, default=10000)
    display_order = Column(Integer, default=1)
    device = relationship("Device", back_populates="tanks")
    motors = relationship("Motor", back_populates="tank", cascade="all, delete-orphan")


class Motor(Base):
    __tablename__ = "motors"
    id = Column(Integer, primary_key=True, index=True)
    tank_id = Column(Integer, ForeignKey("tanks.id"), nullable=False)
    name = Column(String, nullable=False)
    run_param_key = Column(String, nullable=False)   # current_1..4 | low_pressure
    trip_param_key = Column(String, nullable=False)  # voltage_4..8
    display_order = Column(Integer, default=1)
    tank = relationship("Tank", back_populates="motors")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
