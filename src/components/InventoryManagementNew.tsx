import { useState, useEffect } from 'react';
import { InventoryItem } from '../App';
import { Package, Plus, X, Edit, Search, Zap, AlertCircle, TrendingDown, History, Settings, Eye, Trash2, Save, Loader } from 'lucide-react';
import SERVICE_TYPES from '../data/serviceTypes';
import { toast } from 'sonner';
import { inventoryAPI } from '../api';
import { getBaseQuantity, getQuantityBreakdown, formatQuantityDisplay, getBaseUnitLabel, getMainUnitLabel, getConversionValue } from '../utils/inventoryUnits';

type InventoryManagementProps = {
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  onDataChanged?: () => Promise<void>;
};

// Types for auto-reduction
interface AutoReductionRule {
  id: number;
  appointmentType: string;
  inventoryItemId: number;
  inventoryItemName: string;
  quantityToReduce: number;
  isActive: boolean;
  currentQuantity: number;
}

interface ReductionHistory {
  id: number;
  appointmentId: number;
  patientId: number;
  patientName: string;
  appointmentType: string;
  inventoryItemId: number;
  inventoryItemName: string;
  quantityReduced: number;
  quantityBefore: number;
  quantityAfter: number;
  reducedAt: string;
}

export function InventoryManagement({ inventory, setInventory, onDataChanged }: InventoryManagementProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'auto-reduction' | 'history'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [autoReductionRules, setAutoReductionRules] = useState<AutoReductionRule[]>([]);
  const [reductionHistory, setReductionHistory] = useState<ReductionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Auto-reduction state
  const [appointmentType, setAppointmentType] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | string>('');
  const [quantityToReduce, setQuantityToReduce] = useState<string>('');
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState(1);

  // History filters
  const [historyFilter, setHistoryFilter] = useState<'all' | 'patient' | 'item' | 'appointment'>('all');
  const [filterValue, setFilterValue] = useState('');

  const getMinLevel = (item: InventoryItem) => Math.max(0, item.minQuantity || 0);
  const getStockStatus = (item: InventoryItem) => {
    const baseQty = getBaseQuantity(item);
    if (baseQty === 0) return 'out_of_stock';
    if (baseQty <= getMinLevel(item)) return 'critical';
    return 'normal';
  };

  // Load auto-reduction rules
  const loadAutoReductionRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/inventory-management/auto-reduction/rules`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAutoReductionRules(data);
      }
    } catch (error) {
      console.error('Error loading auto-reduction rules:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load reduction history
  const loadReductionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/inventory-management/history?limit=1000`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReductionHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading reduction history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load overview data
  const loadOverview = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/inventory-management/overview`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Data already in overview format
      }
    } catch (error) {
      console.error('Error loading overview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'auto-reduction') {
      loadAutoReductionRules();
    } else if (activeTab === 'history') {
      loadReductionHistory();
    } else {
      loadOverview();
    }
  }, [activeTab]);

  // Handle add inventory item
  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const newItem = {
        name: formData.get('name') as string,
        quantity: parseInt(formData.get('quantity') as string),
        unit: formData.get('unit') as string,
        minQuantity: parseInt(formData.get('minQuantity') as string) || 5,
      };
      const createdItem = await inventoryAPI.create(newItem);
      setInventory([...inventory, createdItem as InventoryItem]);
      setShowAddModal(false);
      toast.success('Item added successfully!');
      if (onDataChanged) await onDataChanged();
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item');
    }
  };

  // Handle update inventory item
  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const formData = new FormData(e.currentTarget);
      const updatedItem = {
        ...editingItem,
        name: formData.get('name') as string,
        quantity: parseInt(formData.get('quantity') as string),
        unit: formData.get('unit') as string,
        minQuantity: parseInt(formData.get('minQuantity') as string) || 5,
      };
      await inventoryAPI.update(updatedItem.id, updatedItem);
      setInventory(inventory.map(item => item.id === updatedItem.id ? updatedItem : item));
      setEditingItem(null);
      toast.success('Item updated successfully!');
      if (onDataChanged) await onDataChanged();
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };

  // Delete inventory item
  const deleteItem = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryAPI.delete(id);
        setInventory(inventory.filter(item => item.id !== id));
        toast.success('Item deleted successfully!');
        if (onDataChanged) await onDataChanged();
      } catch (error) {
        console.error('Failed to delete item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  // Create auto-reduction rule
  const createAutoReductionRule = async () => {
    if (!appointmentType.trim() || !selectedItemId) {
      toast.error('Please select appointment type and inventory item');
      return;
    }

    if (!quantityToReduce || String(quantityToReduce).trim() === '') {
      toast.error('Please enter quantity to deduct');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/inventory-management/auto-reduction/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          appointmentType,
          inventoryItemId: parseInt(selectedItemId.toString()),
          quantityToReduce: Math.max(0, parseInt(String(quantityToReduce) || '0', 10)),
        }),
      });

      if (response.ok) {
        toast.success('Auto-reduction rule created successfully!');
        setAppointmentType('');
        setSelectedItemId('');
        setQuantityToReduce('');
        await loadAutoReductionRules();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create rule');
      }
    } catch (error) {
      console.error('Error creating auto-reduction rule:', error);
      toast.error('Failed to create auto-reduction rule');
    }
  };

  // Update auto-reduction rule
  const updateAutoReductionRule = async (ruleId: number) => {
    try {
      const response = await fetch(`${API_BASE}/inventory-management/auto-reduction/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ quantityToReduce: editingQuantity }),
      });

      if (response.ok) {
        toast.success('Rule updated successfully!');
        setEditingRuleId(null);
        await loadAutoReductionRules();
      } else {
        toast.error('Failed to update rule');
      }
    } catch (error) {
      console.error('Error updating auto-reduction rule:', error);
      toast.error('Failed to update rule');
    }
  };

  // Delete auto-reduction rule
  const deleteAutoReductionRule = async (ruleId: number) => {
    if (!confirm('Delete this auto-reduction rule?')) return;

    try {
      const response = await fetch(`${API_BASE}/inventory-management/auto-reduction/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        toast.success('Rule deleted successfully!');
        await loadAutoReductionRules();
      } else {
        toast.error('Failed to delete rule');
      }
    } catch (error) {
      console.error('Error deleting auto-reduction rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  // Filter history
  const filteredHistory = reductionHistory.filter(record => {
    if (!filterValue) return true;
    const value = filterValue.toLowerCase();
    switch (historyFilter) {
      case 'patient':
        return record.patientName.toLowerCase().includes(value);
      case 'item':
        return record.inventoryItemName.toLowerCase().includes(value);
      case 'appointment':
        return record.appointmentType.toLowerCase().includes(value);
      default:
        return true;
    }
  });

  // Filter inventory
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const criticalItems = inventory.filter(item => {
    const baseQty = getBaseQuantity(item);
    return baseQty > 0 && baseQty <= getMinLevel(item);
  });
  const outOfStockItems = inventory.filter(item => getBaseQuantity(item) === 0);

  return (
    <div className="p-6 max-w-[1920px] mx-auto space-y-8">
      {/* Tab Navigation */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200/60 inline-flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('auto-reduction')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'auto-reduction'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            Auto-Reduction Settings
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            Reduction History
          </button>
        </div>

        {activeTab === 'overview' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="group px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all duration-300 shadow-lg shadow-cyan-500/20 flex items-center gap-2 font-medium"
          >
            <div className="bg-white/20 rounded-lg p-1 group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            Add New Item
          </button>
        )}
      </div>

      {/* PAGE 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Inventory Status Bar */}
          <div className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-4 flex flex-wrap items-center gap-6">
             <div className="flex items-center gap-3 pr-6 border-r border-gray-100">
               <div className="p-2 bg-cyan-50 rounded-lg">
                 <Package className="w-5 h-5 text-cyan-600" />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Inventory</p>
                 <p className="text-xl font-extrabold text-gray-900 leading-none">{inventory.length}</p>
               </div>
             </div>

             <div className="flex items-center gap-6 flex-1">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
                   <span className="text-sm font-medium text-gray-600">In Stock: <strong className="text-gray-900">{inventory.filter(i => getBaseQuantity(i) > 0).length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-50"></div>
                   <span className="text-sm font-medium text-gray-600">Low Stock: <strong className="text-gray-900">{criticalItems.length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-50"></div>
                   <span className="text-sm font-medium text-gray-600">Out of Stock: <strong className="text-gray-900">{outOfStockItems.length}</strong></span>
                </div>
             </div>
          </div>

          {/* Critical Items Alert */}
          {criticalItems.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Restock Required
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {criticalItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{formatQuantityDisplay(item)}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-1 rounded-full">Low Stock</span>
                      <span className="text-xs text-amber-700/70 mt-1">Min: {item.minQuantity || 5}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Out of Stock Alert */}
          {outOfStockItems.length > 0 && (
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Depleted Items
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {outOfStockItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">0 {item.unit} available</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider bg-red-50 px-2 py-1 rounded-full">Out of Stock</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Inventory Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                 <div className="bg-cyan-50 p-2 rounded-lg">
                    <Package className="w-5 h-5 text-cyan-600" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900">Inventory List</h3>
              </div>
              <div className="relative max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inventory items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-cyan-500 rounded-xl focus:ring-4 focus:ring-cyan-500/10 transition-all text-sm font-medium"
                />
              </div>
            </div>

            {filteredInventory.length === 0 ? (
              <div className="p-16 text-center">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-gray-300" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">No items found</h4>
                <p className="text-gray-500 max-w-xs mx-auto">
                  We couldn't find any inventory items matching your search. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pieces</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Min Level</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInventory.map(item => {
                      const minLevel = item.minQuantity || 5;
                      const basePieces = getBaseQuantity(item);
                      let status = 'normal';
                      if (basePieces === 0) status = 'out_of_stock';
                      else if (basePieces <= minLevel) status = 'critical';

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900 block">{item.name}</span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg ${
                                  status === 'out_of_stock' ? 'text-red-500' :
                                  status === 'critical' ? 'text-amber-500' :
                                  'text-gray-900'
                                }`}>
                                  {formatQuantityDisplay(item)}
                                </span>
                                {status === 'critical' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                             </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {basePieces.toLocaleString('en-US')}
                              <span className="ml-1 text-xs font-medium text-gray-500 uppercase">
                                {getBaseUnitLabel(item)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                               {item.unit}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-sm font-medium">{minLevel}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm inline-flex items-center gap-1.5 ${
                              status === 'out_of_stock' ? 'bg-red-50 text-red-700 border border-red-100' :
                              status === 'critical' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                status === 'out_of_stock' ? 'bg-red-500' :
                                status === 'critical' ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}></span>
                              {status === 'out_of_stock' ? 'Stockout' :
                               status === 'critical' ? 'Low Stock' :
                               'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                title="Edit Item"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE 2: AUTO-REDUCTION SETTINGS */}
      {activeTab === 'auto-reduction' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           {/* Header */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-50 to-transparent rounded-bl-full opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
             <div className="flex items-start gap-5 relative z-10">
               <div className="p-4 bg-teal-50 rounded-2xl shadow-inner">
                 <Zap className="w-8 h-8 text-teal-600" />
               </div>
               <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Automation Rules</h2>
                  <p className="text-gray-500 mt-2 max-w-2xl text-lg">Define logic to automatically deduct inventory when specific procedures are performed.</p>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Create New Rule Form */}
            <div className="xl:col-span-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-cyan-600" />
                  </div>
                  New Rule
                </h3>

                <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Appointment Type</label>
                      <select
                        value={appointmentType}
                        onChange={(e) => setAppointmentType(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                      >
                        <option value="">Select appointment type</option>
                        {SERVICE_TYPES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Inventory Item</label>
                      <select
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                      >
                        <option value="">Select an item to reduce</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({formatQuantityDisplay(item)})
                          </option>
                        ))}
                      </select>
                    </div>

                      <div>
                       <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity to Deduct</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        aria-valuemin={1}
                        value={quantityToReduce}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setQuantityToReduce(v);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-gray-900 focus:outline-none no-spinner"
                      />
                      </div>

                  <button
                    onClick={createAutoReductionRule}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 font-semibold shadow-lg shadow-cyan-500/20 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 mt-4"
                  >
                    <Plus className="w-5 h-5" />
                    Create Automation Rule
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Rules Table */}
            <div className="xl:col-span-8">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Active Rules</h3>
                  <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full uppercase tracking-wide">
                    {autoReductionRules.length} Configured
                  </span>
                </div>

                {loading ? (
                  <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
                    <Loader className="w-8 h-8 text-teal-600 animate-spin" />
                    <p className="text-gray-500 mt-3 font-medium">Loading details...</p>
                  </div>
                ) : autoReductionRules.length === 0 ? (
                  <div className="p-16 text-center flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-semibold text-lg">No rules defined</p>
                    <p className="text-gray-500 mt-1 max-w-sm">Create your first automation rule using the form.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trigger Event</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Target Item</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {autoReductionRules.map(rule => (
                          <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-5">
                              <div className="font-semibold text-gray-900">{rule.appointmentType}</div>
                              <div className="text-xs text-gray-500 mt-0.5">When completed</div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                                  <span className="text-gray-700 font-medium">{rule.inventoryItemName}</span>
                               </div>
                            </td>
                            <td className="px-6 py-5">
                              {editingRuleId === rule.id ? (
                                <div className="flex gap-2 items-center bg-white p-1 rounded-lg shadow-sm border border-gray-200 w-max">
                                  <input
                                    type="number"
                                    min="1"
                                    value={editingQuantity}
                                    onChange={(e) => setEditingQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 px-2 py-1 border-none focus:ring-0 text-gray-900 font-bold text-center bg-transparent"
                                  />
                                  <button
                                    onClick={() => updateAutoReductionRule(rule.id)}
                                    className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingRuleId(null)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                  Reduce by {rule.quantityToReduce}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-gray-500 font-medium text-sm">{rule.currentQuantity} units</td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingRuleId(rule.id);
                                    setEditingQuantity(rule.quantityToReduce);
                                  }}
                                  className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                  title="Edit Rule"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteAutoReductionRule(rule.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Rule"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-cyan-50/50 border border-cyan-100 rounded-2xl p-4 flex gap-4 items-start text-sm text-cyan-800">
             <AlertCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
             <p className="leading-relaxed">
               <strong>How automation works:</strong> The system monitors completed appointments matching the trigger event types. When a match is found, the specified quantity is immediately deducted from inventory. All actions are logged in the History tab.
             </p>
          </div>
        </div>
      )}

      {/* PAGE 3: REDUCTION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
               <div className="flex gap-5">
                   <div className="p-4 bg-purple-50 rounded-2xl">
                     <History className="w-8 h-8 text-purple-600" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Log</h2>
                     <p className="text-gray-500 mt-2 text-lg">Detailed history of all automated inventory deductions.</p>
                   </div>
               </div>
               
               {/* Summary Stats in Header */}
               {filteredHistory.length > 0 && (
                 <div className="flex gap-6">
                    <div className="text-center px-4 py-2 border-r border-gray-100 last:border-0">
                       <p className="text-3xl font-bold text-gray-900">{filteredHistory.length}</p>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Events</p>
                    </div>
                    <div className="text-center px-4 py-2 border-r border-gray-100 last:border-0">
                       <p className="text-3xl font-bold text-gray-900">{new Set(filteredHistory.map(r => r.patientId)).size}</p>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Patients</p>
                    </div>
                    <div className="text-center px-4 py-2">
                       <p className="text-3xl font-bold text-gray-900">{new Set(filteredHistory.map(r => r.inventoryItemId)).size}</p>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Items</p>
                    </div>
                 </div>
               )}
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row gap-6 sticky top-0 z-20">
               {/* Filter Tabs */}
               <div className="flex p-1.5 bg-gray-100 rounded-xl self-start">
                  {(['all', 'patient', 'item', 'appointment'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setHistoryFilter(type)}
                      className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        historyFilter === type
                          ? 'bg-white text-gray-900 shadow-md transform scale-105'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
               </div>

               {/* Search Filter */}
               {historyFilter !== 'all' && (
                  <div className="relative flex-1 max-w-md animate-in fade-in slide-in-from-left-4 duration-300">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`Filter by ${historyFilter}...`}
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                      autoFocus
                    />
                  </div>
                )}
             </div>

            {/* History Table */}
            {loading ? (
              <div className="p-20 text-center">
                <Loader className="w-10 h-10 text-purple-600 mx-auto animate-spin" />
                <p className="text-gray-500 mt-4 font-medium">Retrieving audit logs...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No records found</h3>
                <p className="text-gray-500 mt-1">Attempts to reduce inventory will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Procedure</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Reduced</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Levels</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <span className="font-bold text-gray-900 block">{record.patientName}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700">
                            {record.appointmentType}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-gray-700 font-medium">{record.inventoryItemName}</td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100 inline-flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {record.quantityReduced} pcs
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                             <span className="w-8 text-right font-medium">{record.quantityBefore} pcs</span>
                             <span className="text-gray-300">→</span>
                             <span className="w-8 font-bold text-gray-900">{record.quantityAfter} pcs</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-gray-500 text-sm">
                          {new Date(record.reducedAt).toLocaleDateString()} <span className="text-gray-300">|</span> {new Date(record.reducedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Package className="w-5 h-5 text-teal-600" />
                </div>
                Add Inventory Item
              </h2>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleAddItem} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    placeholder="e.g. Lidocaine 2%"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit *</label>
                    <select 
                      name="unit" 
                      required 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all appearance-none"
                    >
                      <option value="piece">Piece</option>
                      <option value="box">Box</option>
                      <option value="vial">Vial</option>
                      <option value="bottle">Bottle</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Initial Quantity *</label>
                    <input 
                      type="number" 
                      name="quantity" 
                      required 
                      min="0" 
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Minimum Level Alert</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      name="minQuantity" 
                      min="0" 
                      defaultValue="5" 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all pl-12" 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Min:</div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Alert will be triggered when stock falls below this number.</p>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)} 
                    className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 font-medium shadow-lg shadow-cyan-500/20 transform hover:-translate-y-0.5 transition-all"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Edit className="w-5 h-5 text-teal-600" />
                </div>
                Edit Inventory Item
              </h2>
              <button 
                onClick={() => setEditingItem(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleUpdateItem} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    defaultValue={editingItem.name} 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit *</label>
                    <select 
                      name="unit" 
                      required 
                      defaultValue={editingItem.unit} 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all appearance-none"
                    >
                      <option value="piece">Piece</option>
                      <option value="box">Box</option>
                      <option value="vial">Vial</option>
                      <option value="bottle">Bottle</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity *</label>
                    <input 
                      type="number" 
                      name="quantity" 
                      required 
                      min="0" 
                      defaultValue={editingItem.quantity} 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Minimum Level Alert</label>
                   <div className="relative">
                    <input 
                      type="number" 
                      name="minQuantity" 
                      min="0" 
                      defaultValue={editingItem.minQuantity || 5} 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all pl-12" 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Min:</div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingItem(null)} 
                    className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 font-medium shadow-lg shadow-cyan-500/20 transform hover:-translate-y-0.5 transition-all"
                  >
                    Update Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
