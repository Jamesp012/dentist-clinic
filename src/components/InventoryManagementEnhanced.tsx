import { useState, useEffect } from 'react';
import { InventoryItem } from '../App';
import { Package, Plus, X, Edit, Search, Zap, AlertCircle, TrendingDown, History, Settings, Eye, Trash2, Save, Loader, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryAPI } from '../api';

type InventoryManagementProps = {
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  onDataChanged?: () => Promise<void>;
};

// Types for auto-reduction
interface RuleItem {
  itemId: number;
  itemName: string;
  quantityToReduce: number;
  quantityUnit?: 'box' | 'piece';
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

export function InventoryManagement({ inventory, setInventory, onDataChanged }: InventoryManagementProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'auto-reduction' | 'history'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [autoReductionRules, setAutoReductionRules] = useState<AutoReductionRule[]>([]);
  const [reductionHistory, setReductionHistory] = useState<ReductionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);

  // Edit form state
  const [editFormData, setEditFormData] = useState<InventoryItem | null>(null);
  // Add form state
  const [newItemForm, setNewItemForm] = useState<Partial<InventoryItem>>({
    name: '',
    quantity: 0,
    quantityPerBox: undefined,
    unit: 'piece',
    minQuantity: 0,
    category: '',
    supplier: '',
    cost: 0,
  });

  // Auto-reduction form state
  const [appointmentType, setAppointmentType] = useState('');
  const [availableAppointmentTypes, setAvailableAppointmentTypes] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<RuleItem[]>([]);
  const [selectedItemToAdd, setSelectedItemToAdd] = useState<number | string>('');
  const [quantityForItem, setQuantityForItem] = useState(1);
  const [quantityUnitForItem, setQuantityUnitForItem] = useState<'box' | 'piece'>('piece');
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

  // Load appointment types
  const loadAppointmentTypes = async () => {
    try {
      // First try to fetch from API
      const response = await fetch('http://localhost:5000/api/inventory-management/appointment-types', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.appointmentTypes && data.appointmentTypes.length > 0) {
          setAvailableAppointmentTypes(data.appointmentTypes);
          return;
        }
      }
    } catch (error) {
      console.error('Error loading appointment types from API:', error);
    }
    
    // Fallback to hardcoded types matching the appointment system
    const defaultAppointmentTypes = [
      'Dental consultation',
      'Oral examination',
      'Dental cleaning',
      'Tooth extraction',
      'Braces installation',
      'Consultation'
    ];
    setAvailableAppointmentTypes(defaultAppointmentTypes);
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

  // Add item to rule
  const addItemToRule = () => {
    console.log('Add item clicked. selectedItemToAdd:', selectedItemToAdd);
    
    if (!selectedItemToAdd) {
      toast.error('Please select an item');
      return;
    }

    const itemId = parseInt(selectedItemToAdd.toString());
    console.log('Looking for item with ID:', itemId);
    console.log('Available inventory items:', inventory.map(i => ({ id: i.id, name: i.name })));
    
    const item = inventory.find(i => i.id === itemId);
    if (!item) {
      console.error('Item not found:', itemId);
      toast.error('Item not found in inventory');
      return;
    }

    // Check if item is already added
    if (selectedItems.some(si => si.itemId === itemId)) {
      toast.error('This item is already added to the rule');
      return;
    }

    const newItem: RuleItem = {
      itemId: itemId,
      itemName: item.name,
      quantityToReduce: quantityForItem,
      quantityUnit: quantityUnitForItem
    };

    console.log('Adding item:', newItem);
    setSelectedItems([...selectedItems, newItem]);
    setSelectedItemToAdd('');
    setQuantityForItem(1);
    setQuantityUnitForItem('piece');
    toast.success('Item added to rule');
  };

  // Remove item from rule
  const removeItemFromRule = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Create auto-reduction rule
  const createAutoReductionRule = async () => {
    console.log('Create rule clicked');
    console.log('Appointment type:', appointmentType);
    console.log('Selected items:', selectedItems);
    
    if (!appointmentType) {
      toast.error('Please select an appointment type');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one item to the rule');
      return;
    }

    setCreatingRule(true);
    try {
      const payload = {
        appointmentType,
        items: selectedItems,
      };

      console.log('Creating rule with payload:', payload);
      console.log('Sending to:', 'http://localhost:5000/api/inventory-management/auto-reduction/rules');

      const response = await fetch('http://localhost:5000/api/inventory-management/auto-reduction/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is JSON or HTML
      const contentType = response.headers.get('content-type');
      let responseData;
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        // If not JSON, it's likely an error page
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Backend returned non-JSON response. Backend may not be running or database tables may not exist.');
      }

      console.log('Response data:', responseData);

      if (response.ok) {
        toast.success('Auto-reduction rule created successfully!');
        // Reset all form fields
        setAppointmentType('');
        setSelectedItems([]);
        setQuantityForItem(1);
        setSelectedItemToAdd('');
        await loadAutoReductionRules();
      } else {
        const errorMsg = responseData.error || responseData.message || 'Failed to create rule';
        console.error('Server error:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('Failed to fetch')) {
        toast.error('Cannot connect to backend. Is the server running on localhost:5000?');
      } else {
        toast.error('Failed to create rule: ' + errorMsg);
      }
    } finally {
      setCreatingRule(false);
    }
  };

  // Create inventory item
  const handleCreateItem = async () => {
    try {
      const payload = {
        name: newItemForm.name,
        quantity: newItemForm.quantity || 0,
        quantityPerBox: newItemForm.quantityPerBox || undefined,
        unit: newItemForm.unit || 'piece',
        minQuantity: newItemForm.minQuantity || 0,
        category: newItemForm.category || '',
        supplier: newItemForm.supplier || '',
        cost: newItemForm.cost || 0,
      };

      const created = await inventoryAPI.create(payload as any);
      setInventory([...inventory, created as InventoryItem]);
      setShowAddModal(false);
      setNewItemForm({ name: '', quantity: 0, unit: 'piece' });
      toast.success('Inventory item added');
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item');
    }
  };

  // Update auto-reduction rule
  const updateAutoReductionRule = async (ruleId: number, newItems: RuleItem[]) => {
    try {
      const response = await fetch(`http://localhost:5000/api/inventory-management/auto-reduction/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ items: newItems }),
      });

      if (response.ok) {
        toast.success('Rule updated successfully!');
        setEditingRuleId(null);
        await loadAutoReductionRules();
      } else {
        toast.error('Failed to update rule');
      }
    } catch (error) {
      console.error('Error updating rule:', error);
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
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Per Box/Pack</th>
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
                          <td className="px-6 py-4 text-gray-600">
                            {item.quantityPerBox ? `${item.quantityPerBox} ${item.unit}` : '-'}
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
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setEditFormData({ ...item });
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded-lg transition-colors"
                              title="Edit this inventory item"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Edit Item Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Add Inventory Item</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                    <input
                      type="text"
                      value={newItemForm.name}
                      onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={newItemForm.quantity}
                      onChange={(e) => setNewItemForm({ ...newItemForm, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Per Box/Pack</label>
                    <input
                      type="number"
                      value={newItemForm.quantityPerBox || ''}
                      onChange={(e) => setNewItemForm({ ...newItemForm, quantityPerBox: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="e.g., 12 items per box"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                    <input
                      type="text"
                      value={newItemForm.unit}
                      onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Level</label>
                    <input
                      type="number"
                      value={newItemForm.minQuantity}
                      onChange={(e) => setNewItemForm({ ...newItemForm, minQuantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex gap-3">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={handleCreateItem} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          )}

          {editingItem && editFormData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Inventory Item</h3>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setEditFormData(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Per Box/Pack</label>
                    <input
                      type="number"
                      value={editFormData.quantityPerBox || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, quantityPerBox: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="e.g., 12 items per box"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                    <input
                      type="text"
                      value={editFormData.unit}
                      onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Level</label>
                    <input
                      type="number"
                      value={editFormData.minQuantity}
                      onChange={(e) => setEditFormData({ ...editFormData, minQuantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <input
                      type="text"
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                    <input
                      type="text"
                      value={editFormData.supplier}
                      onChange={(e) => setEditFormData({ ...editFormData, supplier: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cost</label>
                    <input
                      type="number"
                      value={editFormData.cost}
                      onChange={(e) => setEditFormData({ ...editFormData, cost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setEditFormData(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (editFormData) {
                        try {
                          await inventoryAPI.update(editFormData.id, editFormData);
                          const updatedInventory = inventory.map(item => 
                            item.id === editingItem.id ? editFormData : item
                          );
                          setInventory(updatedInventory);
                          setEditingItem(null);
                          setEditFormData(null);
                          toast.success('Item updated successfully');
                        } catch (error) {
                          console.error('Failed to update item:', error);
                          toast.error('Failed to update item');
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
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

          {/* Backend Status Alert */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900">Backend Server Required</h3>
              <p className="text-sm text-yellow-800 mt-1">
                The backend server must be running for this feature to work. If you see a "cannot connect to backend" error when creating a rule, please start the backend server:
              </p>
              <code className="block mt-2 bg-yellow-100 px-3 py-1 rounded text-xs font-mono text-yellow-900">
                cd backend && npm start
              </code>
            </div>
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
                      {inventory.filter(item => !selectedItems.some(si => si.itemId.toString() === item.id.toString())).map(item => (
                        <option key={item.id} value={item.id.toString()}>
                          {item.name} ({item.quantity} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={quantityUnitForItem}
                      onChange={(e) => setQuantityUnitForItem(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="piece">piece</option>
                      <option value="box">box</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={quantityForItem}
                      onChange={(e) => setQuantityForItem(Math.max(0, parseInt(e.target.value) || 0))}
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
                disabled={!appointmentType || selectedItems.length === 0 || creatingRule}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingRule ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Rule
                  </>
                )}
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
                        {editingRuleId === rule.id ? 'Cancel Edit' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteAutoReductionRule(rule.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm flex items-center gap-2"
                      >
                        <Trash className="w-4 h-4" />
                        Delete
                      </button>
                    </div>

                    {/* Edit Form */}
                    {editingRuleId === rule.id && (
                      <div className="mt-6 pt-6 border-t border-gray-200 bg-blue-50 p-4 rounded-lg space-y-4">
                        <h5 className="font-medium text-gray-900">Edit Items for {rule.appointmentType}</h5>
                        
                        {/* Current Items List with Inline Editing */}
                        <div className="space-y-3">
                          {rule.items.map((item, index) => (
                            <div key={index} className="flex gap-2 items-end bg-white p-3 rounded border border-gray-200">
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-700 mb-1">Item: {item.itemName}</p>
                              </div>
                              <div className="w-20">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.quantityToReduce}
                                  onChange={(e) => {
                                    const newItems = [...rule.items];
                                    newItems[index] = {
                                      ...item,
                                      quantityToReduce: Math.max(0, parseInt(e.target.value) || 0)
                                    };
                                    const updatedRules = autoReductionRules.map(r =>
                                      r.id === rule.id ? { ...r, items: newItems } : r
                                    );
                                    setAutoReductionRules(updatedRules);
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const newItems = rule.items.filter((_, i) => i !== index);
                                  const updatedRules = autoReductionRules.map(r =>
                                    r.id === rule.id ? { ...r, items: newItems } : r
                                  );
                                  setAutoReductionRules(updatedRules);
                                }}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add More Items */}
                        <div className="border-t border-blue-200 pt-4">
                          <h6 className="text-xs font-medium text-gray-700 mb-2">Add More Items</h6>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <div>
                              <select
                                value={selectedItemToAdd}
                                onChange={(e) => setSelectedItemToAdd(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="">Select item...</option>
                                {inventory.filter(item => !rule.items.some(si => si.itemId === item.id)).map(item => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <select
                                value={quantityUnitForItem}
                                onChange={(e) => setQuantityUnitForItem(e.target.value as any)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="piece">piece</option>
                                <option value="box">box</option>
                              </select>
                            </div>

                            <div>
                              <input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={quantityForItem}
                                onChange={(e) => setQuantityForItem(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <button
                              onClick={() => {
                                if (!selectedItemToAdd) {
                                  toast.error('Please select an item');
                                  return;
                                }

                                const item = inventory.find(i => i.id === selectedItemToAdd);
                                if (!item) return;

                                const newItem: RuleItem = {
                                  itemId: parseInt(selectedItemToAdd.toString()),
                                  itemName: item.name,
                                  quantityToReduce: quantityForItem,
                                  quantityUnit: quantityUnitForItem
                                };

                                const newItems = [...rule.items, newItem];
                                const updatedRules = autoReductionRules.map(r =>
                                  r.id === rule.id ? { ...r, items: newItems } : r
                                );
                                setAutoReductionRules(updatedRules);
                                setSelectedItemToAdd('');
                                setQuantityForItem(1);
                                setQuantityUnitForItem('piece');
                              }}
                              className="w-full px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Save/Cancel */}
                        <div className="flex gap-2 pt-4 border-t border-blue-200">
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              updateAutoReductionRule(rule.id, rule.items);
                              setSelectedItemToAdd('');
                              setQuantityForItem(1);
                            }}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )}
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
