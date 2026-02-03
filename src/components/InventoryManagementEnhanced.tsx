import { useState, useEffect } from 'react';
import { InventoryItem } from '../App';
import { Package, Plus, X, Edit, Search, Zap, AlertCircle, TrendingDown, History, Settings, Eye, Trash, Save, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  serviceName: string;
  category: string;
  description: string[];
  duration: string;
  price?: string;
}

type InventoryManagementProps = {
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  onDataChanged?: () => Promise<void>;
  services?: Service[];
};

// Types for auto-reduction
interface RuleItem {
  itemId: number;
  itemName: string;
  quantityToReduce: number;
}

interface AutoReductionRule {
  id: number;
  appointmentType: string;
  items: RuleItem[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export function InventoryManagement({ inventory, setInventory, onDataChanged, services = [] }: InventoryManagementProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'auto-reduction' | 'history'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoReductionRules, setAutoReductionRules] = useState<AutoReductionRule[]>([]);
  const [reductionHistory, setReductionHistory] = useState<ReductionHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-reduction form state
  const [appointmentType, setAppointmentType] = useState('');
  const [availableAppointmentTypes, setAvailableAppointmentTypes] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<RuleItem[]>([]);
  const [selectedItemToAdd, setSelectedItemToAdd] = useState<number | string>('');
  const [quantityForItem, setQuantityForItem] = useState(1);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

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

  // Load appointment types from services
  const loadAppointmentTypes = () => {
    try {
      // Extract service names from services prop
      if (services && services.length > 0) {
        const serviceNames = services.map(service => service.serviceName);
        setAvailableAppointmentTypes(serviceNames);
      } else {
        // Fallback to fetching from API if no services provided
        const fetchTypes = async () => {
          try {
            const response = await fetch('http://localhost:5000/api/inventory-management/appointment-types', {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (response.ok) {
              const data = await response.json();
              setAvailableAppointmentTypes(data.appointmentTypes || []);
            }
          } catch (error) {
            console.error('Error loading appointment types:', error);
          }
        };
        fetchTypes();
      }
    } catch (error) {
      console.error('Error loading appointment types from services:', error);
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
        if (data.items) setInventory(data.items);
      }
    } catch (error) {
      console.error('Error loading overview:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    } else if (activeTab === 'auto-reduction') {
      loadAutoReductionRules();
      loadAppointmentTypes();
    } else if (activeTab === 'history') {
      loadReductionHistory();
    }
  }, [activeTab]);

  // Update appointment types when services change
  useEffect(() => {
    if (services && services.length > 0) {
      const serviceNames = services.map(service => service.serviceName);
      setAvailableAppointmentTypes(serviceNames);
    }
  }, [services]);

  // Add item to rule
  const addItemToRule = () => {
    if (!selectedItemToAdd) {
      toast.error('Please select an item');
      return;
    }

    const item = inventory.find(i => i.id === selectedItemToAdd);
    if (!item) return;

    const newItem: RuleItem = {
      itemId: parseInt(selectedItemToAdd.toString()),
      itemName: item.name,
      quantityToReduce: quantityForItem
    };

    setSelectedItems([...selectedItems, newItem]);
    setSelectedItemToAdd('');
    setQuantityForItem(1);
  };

  // Remove item from rule
  const removeItemFromRule = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Create auto-reduction rule
  const createAutoReductionRule = async () => {
    if (!appointmentType) {
      toast.error('Please select an appointment type');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one item to the rule');
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
          items: selectedItems,
        }),
      });

      if (response.ok) {
        toast.success('Auto-reduction rule created successfully!');
        setAppointmentType('');
        setSelectedItems([]);
        await loadAutoReductionRules();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create rule');
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error('Failed to create rule');
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
      console.error('Error deleting rule:', error);
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
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Inventory Overview</h2>
              <p className="text-gray-600 mt-2">View all inventory items and stock status</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{inventory.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">In Stock</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {inventory.filter(i => i.quantity > (i.minQuantity || 5)).length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">Critical Level</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{criticalItems.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">Out of Stock</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{outOfStockItems.length}</p>
            </div>
          </div>

          {/* Critical Level Alert */}
          {criticalItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Critical Inventory Levels
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
            <p className="text-gray-600 mt-2">Configure which items reduce for each procedure type</p>
          </div>

          {/* Create New Rule Form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Rule</h3>
              <p className="text-sm text-gray-600 mt-1">Add a new auto-reduction rule with multiple items</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Appointment Type Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Type / Service *
                </label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a service type...</option>
                  {availableAppointmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {appointmentType && (
                  <p className="text-xs text-blue-600 mt-1">✓ Selected: {appointmentType}</p>
                )}
              </div>

              {/* Selected Items */}
              {selectedItems.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">Items in This Rule ({selectedItems.length})</h4>
                  <div className="space-y-2">
                    {selectedItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-3 rounded border border-blue-100">
                        <div>
                          <p className="font-medium text-gray-900">{item.itemName}</p>
                          <p className="text-xs text-gray-600">Reduce by {item.quantityToReduce} unit{item.quantityToReduce !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                          onClick={() => removeItemFromRule(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Items to Rule */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
                <h4 className="font-medium text-gray-900">Add Items to Rule</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                    <select
                      value={selectedItemToAdd}
                      onChange={(e) => setSelectedItemToAdd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select item...</option>
                      {inventory.filter(item => !selectedItems.some(si => si.itemId === item.id)).map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.quantity} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={quantityForItem}
                      onChange={(e) => setQuantityForItem(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={addItemToRule}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Create Rule Button */}
              <button
                onClick={createAutoReductionRule}
                disabled={!appointmentType || selectedItems.length === 0}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Create Rule
              </button>
            </div>
          </div>

          {/* Existing Rules */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Existing Rules</h3>
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
                <p className="text-gray-600">No rules configured yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {autoReductionRules.map(rule => (
                  <div key={rule.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{rule.appointmentType}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {rule.items.length} item{rule.items.length !== 1 ? 's' : ''} configured
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Rule Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {rule.items.map((item, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded border border-gray-200">
                          <p className="font-medium text-gray-900 text-sm">{item.itemName}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Reduces by <span className="font-semibold">{item.quantityToReduce}</span> unit{item.quantityToReduce !== 1 ? 's' : ''}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRuleId(editingRuleId === rule.id ? null : rule.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteAutoReductionRule(rule.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm flex items-center gap-2"
                      >
                        <Trash className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-blue-900 text-sm">
              <strong>How it works:</strong> Create rules that automatically reduce multiple items when an appointment of that type is marked as completed. Each service type can have its own set of items with specific quantities.
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
            <p className="text-gray-600 mt-2">Complete audit trail of all inventory reductions</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Filter By</label>
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Records</option>
                  <option value="patient">Patient Name</option>
                  <option value="item">Item Name</option>
                  <option value="appointment">Appointment Type</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <input
                  type="text"
                  placeholder={`Search by ${historyFilter === 'patient' ? 'patient' : historyFilter === 'item' ? 'item' : historyFilter === 'appointment' ? 'type' : 'any field'}...`}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <Loader className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
                <p className="text-gray-600 mt-3">Loading history...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center">
                <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Reduced By</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Before → After</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
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
                          <span className="font-semibold text-red-600">-{record.quantityReduced}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{record.quantityBefore}</span>
                            <span className="text-gray-500">→</span>
                            <span className="font-medium text-gray-900">{record.quantityAfter}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {new Date(record.reducedAt).toLocaleDateString()} {new Date(record.reducedAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            {filteredHistory.length > 0 && (
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Total Reductions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{filteredHistory.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Unique Patients</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {new Set(filteredHistory.map(r => r.patientName)).size}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Unique Items</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {new Set(filteredHistory.map(r => r.inventoryItemId)).size}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Unique Services</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {new Set(filteredHistory.map(r => r.appointmentType)).size}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryManagement;
