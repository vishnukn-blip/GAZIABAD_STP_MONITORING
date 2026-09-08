import React, { useState, useEffect } from 'react';
import { DollarSign, Wrench, ShieldCheck, PlusCircle, Trash2, X, ShoppingCart } from 'lucide-react';
import { getCentralPlantReplacements, saveCentralPlantReplacements } from '../api';

interface PlantReplacementsViewProps {
  deviceId: string;
  deviceName: string;
}

export interface ReplacementRecord {
  id: string;
  device_id: string;
  replacement_date: string;
  category: 'Motor' | 'Pump / Impeller' | 'Sensor / Transmitter' | 'Electrical & VFD' | 'Valves & Piping' | 'Other Equipment';
  component_name: string;
  quantity: number;
  old_part_details: string;
  new_part_details: string;
  vendor_name: string;
  invoice_no: string;
  part_cost: number;
  labor_cost: number;
  total_cost: number;
  warranty_months: number;
  reason_notes: string;
}

export const PlantReplacementsView: React.FC<PlantReplacementsViewProps> = ({ deviceId, deviceName }) => {
  const [records, setRecords] = useState<ReplacementRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Omit<ReplacementRecord, 'id' | 'device_id' | 'total_cost'>>({
    replacement_date: new Date().toISOString().split('T')[0],
    category: 'Motor',
    component_name: 'M1_60_HP (TANK_A)',
    quantity: 1,
    old_part_details: 'Kirloskar 60 HP Motor (S/N: KBL-2021-992)',
    new_part_details: 'ABB 75 HP High-Efficiency Motor (S/N: ABB-2026-441)',
    vendor_name: 'ABB India Ltd / WABAG Spares',
    invoice_no: 'INV-2026-8810',
    part_cost: 145000,
    labor_cost: 12000,
    warranty_months: 12,
    reason_notes: 'Motor winding burnout due to power fluctuation. Replaced with upgraded 75 HP ABB motor.'
  });

  // Load from Central SQLite API with default seed data fallback
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const centralData = await getCentralPlantReplacements();
        if (centralData && Array.isArray(centralData) && centralData.length > 0) {
          setRecords(centralData);
        } else {
          // Initial demonstration seed records
          const seedRecords: ReplacementRecord[] = [
            {
              id: 'rep_1',
              device_id: deviceId,
              replacement_date: '2026-08-20',
              category: 'Motor',
              component_name: 'M1_60_HP (TANK_A)',
              quantity: 1,
              old_part_details: 'Kirloskar 60 HP (S/N: KBL-8821)',
              new_part_details: 'ABB IE3 75 HP Motor (S/N: ABB-90412)',
              vendor_name: 'ABB India Ltd / WABAG',
              invoice_no: 'INV-2026-7840',
              part_cost: 145000,
              labor_cost: 12000,
              total_cost: 157000,
              warranty_months: 24,
              reason_notes: 'Stator winding insulation breakdown. Upgraded to IE3 high efficiency motor.'
            },
            {
              id: 'rep_2',
              device_id: deviceId,
              replacement_date: '2026-07-15',
              category: 'Sensor / Transmitter',
              component_name: 'Inlet Sump Ultrasonic Level Sensor',
              quantity: 1,
              old_part_details: 'Siemens Probe LU (Faulty signal)',
              new_part_details: 'Endress+Hauser FMR20 Radar Sensor',
              vendor_name: 'E+H India Pvt Ltd',
              invoice_no: 'INV-2026-5519',
              part_cost: 42000,
              labor_cost: 5000,
              total_cost: 47000,
              warranty_months: 12,
              reason_notes: '4-20mA loop output drift due to moisture ingress. Replaced with IP68 radar sensor.'
            },
            {
              id: 'rep_3',
              device_id: deviceId,
              replacement_date: '2026-06-02',
              category: 'Valves & Piping',
              component_name: 'Filter Feed Motorized Butterfly Valve 150mm',
              quantity: 2,
              old_part_details: 'Cast Iron Disc Valve (Corroded)',
              new_part_details: 'SS316 Pneumatic Butterfly Valve',
              vendor_name: 'Audco Valves Ltd',
              invoice_no: 'INV-2026-3301',
              part_cost: 28000,
              labor_cost: 4000,
              total_cost: 32000,
              warranty_months: 12,
              reason_notes: 'Heavy internal corrosion causing sludge leakage.'
            }
          ];
          setRecords(seedRecords);
          await saveCentralPlantReplacements(seedRecords);
        }
      } catch {}
    };

    loadRecords();
  }, [deviceId]);

  // Handle Adding New Replacement Record
  const handleAddRecord = async () => {
    if (!formData.component_name || !formData.vendor_name) return;

    const total_cost = Number(formData.part_cost || 0) + Number(formData.labor_cost || 0);

    const newRecord: ReplacementRecord = {
      id: `rep_${Date.now()}`,
      device_id: deviceId,
      ...formData,
      quantity: Number(formData.quantity || 1),
      part_cost: Number(formData.part_cost || 0),
      labor_cost: Number(formData.labor_cost || 0),
      warranty_months: Number(formData.warranty_months || 12),
      total_cost
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    await saveCentralPlantReplacements(updated);

    setShowAddModal(false);

    // Reset Form
    setFormData({
      replacement_date: new Date().toISOString().split('T')[0],
      category: 'Motor',
      component_name: '',
      quantity: 1,
      old_part_details: '',
      new_part_details: '',
      vendor_name: '',
      invoice_no: '',
      part_cost: 0,
      labor_cost: 0,
      warranty_months: 12,
      reason_notes: ''
    });
  };

  // Handle Deleting Record
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this replacement record?')) return;
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    await saveCentralPlantReplacements(updated);
  };

  // Filter Records by Selected Category
  const filteredRecords = selectedCategory === 'ALL'
    ? records
    : records.filter(r => r.category === selectedCategory);

  // Financial KPI Summaries
  const totalExpenditure = records.reduce((sum, r) => sum + r.total_cost, 0);
  const totalHardwareCost = records.reduce((sum, r) => sum + r.part_cost, 0);
  const totalLaborCost = records.reduce((sum, r) => sum + r.labor_cost, 0);

  // Check Active Warranty Status
  const isUnderWarranty = (recDateStr: string, warrantyMonths: number) => {
    const recDate = new Date(recDateStr);
    const expiryDate = new Date(recDate.setMonth(recDate.getMonth() + warrantyMonths));
    return new Date() < expiryDate;
  };

  const activeWarrantyCount = records.filter(r => isUnderWarranty(r.replacement_date, r.warranty_months)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Banner & Financial KPI Cards */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#ECFDF5', padding: '8px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                <DollarSign size={22} color="#059669" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Plant Component Replacements & Financial Costing
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0', fontWeight: 600 }}>
              Device: <strong>{deviceName}</strong> ({deviceId}) — Track Replaced Equipment, Invoice Costs (₹), and Warranties
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#059669',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <PlusCircle size={18} />
            + Record Replacement & Expense
          </button>
        </div>

        {/* Overview KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {/* Total Spend */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px', borderRadius: '10px' }}>
              <DollarSign size={22} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>
                ₹{totalExpenditure.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Total Plant Spend</div>
            </div>
          </div>

          {/* Hardware Cost */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '10px', borderRadius: '10px' }}>
              <ShoppingCart size={22} color="#0284C7" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7' }}>
                ₹{totalHardwareCost.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Hardware & Part Cost</div>
            </div>
          </div>

          {/* Labor Cost */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px', borderRadius: '10px' }}>
              <Wrench size={22} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706' }}>
                ₹{totalLaborCost.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Labor & Service Fees</div>
            </div>
          </div>

          {/* Active Warranties */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#F3E8FF', border: '1px solid #D8B4FE', padding: '10px', borderRadius: '10px' }}>
              <ShieldCheck size={22} color="#9333EA" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#9333EA' }}>
                {activeWarrantyCount} Parts
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Under Active Warranty</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Replacements Table Container */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Category Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            📜 Component Replacements & Expenditure Log ({filteredRecords.length})
          </h3>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['ALL', 'Motor', 'Pump / Impeller', 'Sensor / Transmitter', 'Electrical & VFD', 'Valves & Piping'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedCategory === cat ? '#0284C7' : '#F1F5F9',
                  color: selectedCategory === cat ? '#FFFFFF' : '#64748B'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '14px 16px' }}>Date & Category</th>
                <th style={{ padding: '14px 16px' }}>Component Name & Location</th>
                <th style={{ padding: '14px 16px' }}>Replaced Part Details</th>
                <th style={{ padding: '14px 16px' }}>Vendor & Invoice No.</th>
                <th style={{ padding: '14px 16px' }}>Cost Breakdown (₹)</th>
                <th style={{ padding: '14px 16px' }}>Warranty</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B', fontWeight: 600 }}>
                    No component replacement logs found for category: {selectedCategory}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const activeWarranty = isUnderWarranty(rec.replacement_date, rec.warranty_months);

                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                      {/* Date & Category */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{rec.replacement_date}</div>
                        <span style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#F0F9FF',
                          color: '#0284C7',
                          border: '1px solid #BAE6FD'
                        }}>
                          {rec.category}
                        </span>
                      </td>

                      {/* Component Name & Qty */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>{rec.component_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Qty: {rec.quantity} Unit(s)</div>
                      </td>

                      {/* Replaced Part Details */}
                      <td style={{ padding: '16px', maxWidth: '240px' }}>
                        <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                          ✨ New: {rec.new_part_details}
                        </div>
                        {rec.old_part_details && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            ♻️ Old: {rec.old_part_details}
                          </div>
                        )}
                        {rec.reason_notes && (
                          <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '4px', fontStyle: 'italic' }}>
                            📝 {rec.reason_notes}
                          </div>
                        )}
                      </td>

                      {/* Vendor & Invoice */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, color: '#334155' }}>{rec.vendor_name}</div>
                        <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 700, marginTop: '2px' }}>
                          📄 {rec.invoice_no || 'N/A'}
                        </div>
                      </td>

                      {/* Cost Breakdown */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>
                          ₹{rec.total_cost.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                          Part: ₹{rec.part_cost.toLocaleString('en-IN')} | Labor: ₹{rec.labor_cost.toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Warranty Status */}
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: activeWarranty ? '#F3E8FF' : '#F1F5F9',
                          color: activeWarranty ? '#9333EA' : '#64748B',
                          border: `1px solid ${activeWarranty ? '#D8B4FE' : '#CBD5E1'}`
                        }}>
                          {activeWarranty ? `🛡️ Active (${rec.warranty_months} Mo)` : 'Expired'}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          title="Delete Record"
                          style={{
                            background: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            color: '#DC2626'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Replacement & Expense Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #CBD5E1'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#ECFDF5', padding: '8px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                  <PlusCircle size={22} color="#059669" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Record Component Replacement & Expense
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                    Log hardware replacements, vendor invoice numbers, and financial costs
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Replacement Date *</label>
                  <input
                    type="date"
                    value={formData.replacement_date}
                    onChange={e => setFormData({ ...formData, replacement_date: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  >
                    <option value="Motor">⚙️ Motor</option>
                    <option value="Pump / Impeller">💧 Pump / Impeller</option>
                    <option value="Sensor / Transmitter">📡 Sensor / Transmitter</option>
                    <option value="Electrical & VFD">⚡ Electrical & VFD</option>
                    <option value="Valves & Piping">🚰 Valves & Piping</option>
                    <option value="Other Equipment">🛠️ Other Equipment</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Component Name & Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. M1_60_HP (TANK_A) or Inlet Level Sensor"
                    value={formData.component_name}
                    onChange={e => setFormData({ ...formData, component_name: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>New Part Details / Model *</label>
                  <input
                    type="text"
                    placeholder="e.g. ABB 75 HP IE3 Motor (S/N: 99402)"
                    value={formData.new_part_details}
                    onChange={e => setFormData({ ...formData, new_part_details: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Old Part Details (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kirloskar 60 HP Motor (Burnt Stator)"
                    value={formData.old_part_details}
                    onChange={e => setFormData({ ...formData, old_part_details: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Vendor / Supplier Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. ABB India Ltd / WABAG Spares"
                    value={formData.vendor_name}
                    onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Invoice / PO Reference No. *</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-9042"
                    value={formData.invoice_no}
                    onChange={e => setFormData({ ...formData, invoice_no: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                  />
                </div>
              </div>

              {/* Financial Cost Inputs */}
              <div style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <h5 style={{ fontSize: '12px', fontWeight: 800, color: '#059669', margin: 0, textTransform: 'uppercase' }}>
                  💰 Financial Costing Breakdown (₹)
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#065F46' }}>Hardware Part Cost (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.part_cost}
                      onChange={e => setFormData({ ...formData, part_cost: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #6EE7B7', marginTop: '4px', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#065F46' }}>Labor / Installation (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.labor_cost}
                      onChange={e => setFormData({ ...formData, labor_cost: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #6EE7B7', marginTop: '4px', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#065F46' }}>Warranty Period</label>
                    <select
                      value={formData.warranty_months}
                      onChange={e => setFormData({ ...formData, warranty_months: parseInt(e.target.value) || 12 })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #6EE7B7', marginTop: '4px', fontWeight: 700 }}
                    >
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months (1 Year)</option>
                      <option value={24}>24 Months (2 Years)</option>
                      <option value={36}>36 Months (3 Years)</option>
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 800, color: '#065F46', textAlign: 'right', marginTop: '4px' }}>
                  Calculated Total Spend: ₹{(Number(formData.part_cost || 0) + Number(formData.labor_cost || 0)).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Reason for Replacement / Technical Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Enter reason for replacement or technician notes..."
                  value={formData.reason_notes}
                  onChange={e => setFormData({ ...formData, reason_notes: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleAddRecord}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '6px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
                }}
              >
                Save Replacement Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
