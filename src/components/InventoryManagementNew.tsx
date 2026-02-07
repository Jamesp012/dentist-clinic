import { useState, useEffect } from 'react';
import { InventoryItem } from '../App';
import { Package, Plus, X, Edit, Search, Zap, AlertCircle, TrendingDown, History, Settings, Eye, Trash2, Save, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryAPI } from '../api';

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
  const [quantityToReduce, setQuantityToReduce] = useState(1);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState(1);

  // History filters
  const [historyFilter, setHistoryFilter] = useState<'all' | 'patient' | 'item' | 'appointment'>('all');
  const [filterValue, setFilterValue] = useState('');

  // Load auto-reduction rules
  const loadAutoReductionRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/inventory-management/auto-reduction/rules', {
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
      const response = await fetch('http://localhost:5000/api/inventory-management/history?limit=1000', {
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
      const response = await fetch('http://localhost:5000/api/inventory-management/overview', {
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

    try {
      const response = await fetch('http://localhost:5000/api/inventory-management/auto-reduction/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          appointmentType,
          inventoryItemId: parseInt(selectedItemId.toString()),
          quantityToReduce,
        }),
      });

      if (response.ok) {
        toast.success('Auto-reduction rule created successfully!');
        setAppointmentType('');
        setSelectedItemId('');
        setQuantityToReduce(1);
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
      const response = await fetch(`http://localhost:5000/api/inventory-management/auto-reduction/rules/${ruleId}`, {
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
      const response = await fetch(`http://localhost:5000/api/inventory-management/auto-reduction/rules/${ruleId}`, {
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

  const criticalItems = inventory.filter(item => item.quantity > 0 && item.quantity <= (item.minQuantity || 5));
  const outOfStockItems = inventory.filter(item => item.quantity === 0);

  return (
    <div className="p-8 space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('auto-reduction')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'auto-reduction'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          Auto-Reduction Settings
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <History className="w-4 h-4" />
          Reduction History
        </button>
      </div>

      {/* PAGE 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Header removed as requested */}
          <div className="flex justify-between items-center">
            <div></div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Items</p>
                  <p className="text-3xl font-bold mt-2">{inventory.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">In Stock</p>
                  <p className="text-3xl font-bold mt-2">{inventory.filter(i => i.quantity > 0).length}</p>
                </div>
                <Package className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">Critical Stock</p>
                  <p className="text-3xl font-bold mt-2">{criticalItems.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600 opacity-50" />
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Out of Stock</p>
                  <p className="text-3xl font-bold mt-2">{outOfStockItems.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
              </div>
            </div>
          </div>

          {/* Critical Items Alert */}
          {criticalItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Critical Stock Items (Low Inventory)
              </h3>
              <div className="space-y-2">
                {criticalItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded border border-yellow-100">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.quantity} {item.unit}</p>
                    </div>
                    <span className="text-red-600 font-semibold">Min: {item.minQuantity || 5}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Out of Stock Alert */}
          {outOfStockItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Out of Stock Items
              </h3>
              <div className="space-y-2">
                {outOfStockItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded border border-red-100">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">0 {item.unit} available</p>
                    </div>
                    <span className="text-red-600 font-semibold text-lg">OUT</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Inventory Items */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inventory items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredInventory.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No inventory items found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Item Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Unit</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Min Level</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInventory.map(item => {
                      const minLevel = item.minQuantity || 5;
                      let status = 'normal';
                      if (item.quantity === 0) status = 'out_of_stock';
                      else if (item.quantity <= minLevel) status = 'critical';

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900">{item.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${
                              status === 'out_of_stock' ? 'text-red-600' :
                              status === 'critical' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{item.unit}</td>
                          <td className="px-6 py-4 text-gray-600">{minLevel}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                              status === 'critical' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {status === 'out_of_stock' ? 'Out of Stock' :
                               status === 'critical' ? 'Critical' :
                               'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="text-blue-600 hover:text-blue-800 p-1"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <X className="w-4 h-4" />
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
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Auto-Reduction Settings</h2>
            <p className="text-gray-600 mt-2">Configure automatic inventory reduction for appointment procedures</p>
          </div>

          {/* Create New Rule */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Create Auto-Reduction Rule
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Appointment Type</label>
                  <input
                    type="text"
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    placeholder="e.g., Root Canal, Cleaning"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Inventory Item</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an item</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Quantity to Reduce</label>
                  <input
                    type="number"
                    min="1"
                    value={quantityToReduce}
                    onChange={(e) => setQuantityToReduce(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={createAutoReductionRule}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create Rule
              </button>
            </div>
          </div>

          {/* Existing Rules */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Existing Auto-Reduction Rules</h3>
              <p className="text-gray-600 text-sm mt-1">
                {autoReductionRules.length} rule{autoReductionRules.length !== 1 ? 's' : ''} configured
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Loader className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
                <p className="text-gray-600 mt-3">Loading rules...</p>
              </div>
            ) : autoReductionRules.length === 0 ? (
              <div className="p-12 text-center">
                <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No auto-reduction rules configured yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Appointment Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Inventory Item</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Qty to Reduce</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Current Stock</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {autoReductionRules.map(rule => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">{rule.appointmentType}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{rule.inventoryItemName}</td>
                        <td className="px-6 py-4">
                          {editingRuleId === rule.id ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                min="1"
                                value={editingQuantity}
                                onChange={(e) => setEditingQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 px-2 py-1 border border-gray-300 rounded"
                              />
                              <button
                                onClick={() => updateAutoReductionRule(rule.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingRuleId(null)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-semibold text-gray-900">{rule.quantityToReduce}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{rule.currentQuantity} units</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingRuleId(rule.id);
                                setEditingQuantity(rule.quantityToReduce);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAutoReductionRule(rule.id)}
                              className="text-red-600 hover:text-red-800 p-1"
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

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-blue-900">
              <strong>How it works:</strong> When a doctor/assistant marks an appointment as completed, the system will automatically reduce the configured items from inventory. These reductions will be recorded in the Reduction History.
            </p>
          </div>
        </div>
      )}

      {/* PAGE 3: REDUCTION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Reduction History</h2>
            <p className="text-gray-600 mt-2">Track all automatic inventory reductions by appointment</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold mb-4">Filter History</h3>
            <div className="flex gap-4 flex-wrap">
              <div className="flex gap-2">
                {(['all', 'patient', 'item', 'appointment'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setHistoryFilter(type)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      historyFilter === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {historyFilter !== 'all' && (
                <input
                  type="text"
                  placeholder={`Filter by ${historyFilter}...`}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1"
                />
              )}
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <Loader className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
                <p className="text-gray-600 mt-3">Loading history...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No reduction history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Patient</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Appointment Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Quantity Reduced</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Before</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">After</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date/Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredHistory.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">{record.patientName}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{record.appointmentType}</td>
                        <td className="px-6 py-4 text-gray-600">{record.inventoryItemName}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-medium">
                            -{record.quantityReduced}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{record.quantityBefore}</td>
                        <td className="px-6 py-4 text-gray-600">{record.quantityAfter}</td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(record.reducedAt).toLocaleDateString()} {new Date(record.reducedAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {filteredHistory.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-blue-600 text-sm font-medium">Total Reductions</p>
                <p className="text-3xl font-bold mt-2">{filteredHistory.length}</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <p className="text-purple-600 text-sm font-medium">Unique Patients</p>
                <p className="text-3xl font-bold mt-2">
                  {new Set(filteredHistory.map(r => r.patientId)).size}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <p className="text-green-600 text-sm font-medium">Unique Items Reduced</p>
                <p className="text-3xl font-bold mt-2">
                  {new Set(filteredHistory.map(r => r.inventoryItemId)).size}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Add Inventory Item</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Name *</label>
                <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit *</label>
                <select name="unit" required className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
                  <option value="piece">Piece</option>
                  <option value="box">Box</option>
                  <option value="vial">Vial</option>
                  <option value="bottle">Bottle</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Initial Quantity *</label>
                <input type="number" name="quantity" required min="0" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Minimum Level</label>
                <input type="number" name="minQuantity" min="0" defaultValue="5" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Edit Inventory Item</h2>
              <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Name *</label>
                <input type="text" name="name" required defaultValue={editingItem.name} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit *</label>
                <select name="unit" required defaultValue={editingItem.unit} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
                  <option value="piece">Piece</option>
                  <option value="box">Box</option>
                  <option value="vial">Vial</option>
                  <option value="bottle">Bottle</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <input type="number" name="quantity" required min="0" defaultValue={editingItem.quantity} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Minimum Level</label>
                <input type="number" name="minQuantity" min="0" defaultValue={editingItem.minQuantity || 5} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setEditingItem(null)} className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
