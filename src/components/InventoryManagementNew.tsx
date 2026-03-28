import { useState, useEffect } from 'react';
import { InventoryItem } from '../App';
import { Package, Plus, X, Edit, Search, AlertCircle, History, Eye, Trash2, Save, Loader, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryAPI, API_BASE } from '../api';
import { getBaseQuantity, formatQuantityDisplay } from '../utils/inventoryUnits';

type InventoryManagementProps = {
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  onDataChanged?: () => Promise<void>;
};

interface InventoryHistory {
  id: number;
  inventory_id: number;
  item_name: string;
  change_amount: number;
  previous_quantity: number;
  new_quantity: number;
  unit_type: string;
  action_type: 'add' | 'subtract' | 'set';
  reason: string;
  updated_by: string;
  created_at: string;
}

export function InventoryManagement({ inventory, setInventory, onDataChanged }: InventoryManagementProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // Manual Stock Update State
  const [stockAmount, setStockAmount] = useState<number>(1);
  const [stockAction, setStockAction] = useState<'add' | 'subtract' | 'set'>('add');
  const [stockReason, setStockReason] = useState('');
  const [stockUnitType, setStockUnitType] = useState<string>('');
  const [selectedMainUnit, setSelectedMainUnit] = useState<string>('box');

  const getMinLevel = (item: InventoryItem) => Math.max(0, item.minQuantity || 0);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await inventoryAPI.getHistory();
      setInventoryHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (editingItem) {
      setSelectedMainUnit(editingItem.main_unit || editingItem.mainUnit || 'piece');
    } else if (showAddModal) {
      setSelectedMainUnit('box');
    }
  }, [editingItem, showAddModal]);

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const mainUnit = formData.get('mainUnit') as string;
      const conversionValue = parseInt(formData.get('conversionValue') as string) || 0;
      
      const newItem = {
        name: formData.get('name') as string,
        quantity: parseInt(formData.get('quantity') as string) || 0,
        extraPieces: parseInt(formData.get('extraPieces') as string) || 0,
        mainUnit: mainUnit === 'piece' ? null : mainUnit,
        baseUnit: formData.get('baseUnit') as string || 'piece',
        conversionValue: conversionValue > 1 ? conversionValue : null,
        minQuantity: parseInt(formData.get('minQuantity') as string) || 5,
        category: formData.get('category') as string,
        supplier: formData.get('supplier') as string,
        cost: parseFloat(formData.get('cost') as string) || 0,
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

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const formData = new FormData(e.currentTarget);
      const mainUnit = formData.get('mainUnit') as string;
      const conversionValue = parseInt(formData.get('conversionValue') as string) || 0;

      const updatedItem = {
        ...editingItem,
        name: formData.get('name') as string,
        mainUnit: mainUnit === 'piece' ? null : mainUnit,
        baseUnit: formData.get('baseUnit') as string || 'piece',
        conversionValue: conversionValue > 1 ? conversionValue : null,
        minQuantity: parseInt(formData.get('minQuantity') as string) || 5,
        category: formData.get('category') as string,
        supplier: formData.get('supplier') as string,
        cost: parseFloat(formData.get('cost') as string) || 0,
      };
      const result = await inventoryAPI.update(editingItem.id, updatedItem);
      setInventory(inventory.map(item => item.id === editingItem.id ? result as InventoryItem : item));
      setEditingItem(null);
      toast.success('Item updated successfully!');
      if (onDataChanged) await onDataChanged();
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockItem) return;

    try {
      setLoading(true);
      const result = await inventoryAPI.updateStock(stockItem.id, {
        amount: stockAmount,
        action: stockAction,
        reason: stockReason,
        unitType: stockUnitType
      });

      setInventory(inventory.map(item => item.id === stockItem.id ? { ...item, ...result } : item));
      setStockItem(null);
      setStockAmount(1);
      setStockReason('');
      toast.success('Stock updated successfully!');
      if (onDataChanged) await onDataChanged();
    } catch (error) {
      console.error('Failed to update stock:', error);
      toast.error('Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const criticalItems = inventory.filter(item => {
    const baseQty = getBaseQuantity(item);
    return baseQty > 0 && baseQty <= getMinLevel(item);
  });
  const outOfStockItems = inventory.filter(item => getBaseQuantity(item) === 0);

  return (
    <div className="md:p-6 p-3 max-w-[1920px] mx-auto md:space-y-8 space-y-4">
      {/* Tab Navigation */}
      <div className="md:mb-8 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="bg-white md:p-1.5 p-1 rounded-xl md:rounded-2xl shadow-sm border border-gray-200/60 inline-flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 md:px-5 py-1.5 md:py-2.5 rounded-lg md:rounded-xl font-medium text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 md:gap-2 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Inventory List
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 md:px-5 py-1.5 md:py-2.5 rounded-lg md:rounded-xl font-medium text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 md:gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <History className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Stock History
          </button>
        </div>

        {activeTab === 'overview' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="group w-full md:w-auto px-4 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg md:rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all duration-300 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 font-medium text-xs md:text-sm"
          >
            <div className="bg-white/20 rounded-lg p-1 group-hover:scale-110 transition-transform">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </div>
            Add New Item
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="md:space-y-8 space-y-4 animate-in fade-in duration-500">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-3 md:gap-6 group hover:border-cyan-200 transition-all duration-500">
               <div className="p-2.5 md:p-4 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl md:rounded-2xl shadow-lg shadow-cyan-200 group-hover:scale-110 transition-transform duration-500">
                 <Package className="w-4 h-4 md:w-6 md:h-6 text-white" />
               </div>
               <div>
                 <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Total Items</p>
                 <p className="text-lg md:text-3xl font-black text-gray-900 leading-none">{inventory.length}</p>
               </div>
            </div>

            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-3 md:gap-6 group hover:border-emerald-200 transition-all duration-500">
               <div className="p-2.5 md:p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl md:rounded-2xl shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-500">
                 <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
               </div>
               <div>
                 <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">In Stock</p>
                 <p className="text-lg md:text-3xl font-black text-gray-900 leading-none">{inventory.filter(i => getBaseQuantity(i) > 0).length}</p>
               </div>
            </div>

            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-3 md:gap-6 group hover:border-amber-200 transition-all duration-500">
               <div className="p-2.5 md:p-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl md:rounded-2xl shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform duration-500">
                 <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-white" />
               </div>
               <div>
                 <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Low Stock</p>
                 <p className="text-lg md:text-3xl font-black text-gray-900 leading-none">{criticalItems.length}</p>
               </div>
            </div>

            <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-3 md:gap-6 group hover:border-red-200 transition-all duration-500">
               <div className="p-2.5 md:p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl md:rounded-2xl shadow-lg shadow-red-200 group-hover:scale-110 transition-transform duration-500">
                 <X className="w-4 h-4 md:w-6 md:h-6 text-white" />
               </div>
               <div>
                 <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Out of Stock</p>
                 <p className="text-lg md:text-3xl font-black text-gray-900 leading-none">{outOfStockItems.length}</p>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm h-auto md:h-[65vh] transition-all duration-500 hover:shadow-xl">
            <div className="p-4 md:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 bg-gradient-to-b from-gray-50/50 to-white">
              <h3 className="text-base md:text-lg font-bold text-gray-900">Inventory Items</h3>
              <div className="relative max-w-md w-full">
                <Search className="w-3.5 h-3.5 md:w-4 md:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inventory items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-cyan-500 rounded-lg md:rounded-xl transition-all text-[10px] md:text-sm font-medium"
                />
              </div>
            </div>

            <div className="overflow-auto max-h-[50vh] md:h-[70vh] w-full scrollbar-thin border rounded">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-50/50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="w-[45%] md:w-[30%] px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Details</th>
                    <th className="w-[30%] px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock</th>
                    <th className="w-[20%] px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Status</th>
                    <th className="w-[25%] md:w-[20%] px-3 md:px-8 py-3 md:py-5 text-right text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.map(item => {
                    const minLevel = item.minQuantity || 5;
                    const basePieces = getBaseQuantity(item);
                    let statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    let statusLabel = 'In Stock';
                    let statusIcon = <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 mr-1.5 md:mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />;
                    
                    if (basePieces === 0) {
                      statusColor = 'bg-red-50 text-red-600 border-red-100';
                      statusLabel = 'Out of Stock';
                      statusIcon = <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 mr-1.5 md:mr-2 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />;
                    } else if (basePieces <= minLevel) {
                      statusColor = 'bg-amber-50 text-amber-600 border-amber-100';
                      statusLabel = 'Low Stock';
                      statusIcon = <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 mr-1.5 md:mr-2 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />;
                    }

                    return (
                      <tr key={item.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                        <td className="px-3 md:px-8 py-3 md:py-6">
                          <div className="flex items-center gap-2 md:gap-4">
                            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                              <Package className="w-4 h-4 md:w-6 md:h-6 text-cyan-600" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-black text-gray-900 text-[10px] md:text-base block truncate group-hover:text-cyan-600 transition-colors">{item.name}</span>
                              <span className="px-1.5 py-0.5 bg-gray-100 text-[8px] md:text-[10px] font-bold text-gray-500 rounded-md uppercase tracking-wider">{item.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-8 py-3 md:py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-800 text-xs md:text-lg">{formatQuantityDisplay(item)}</span>
                            {item.main_unit && (
                              <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                Total: {basePieces} {item.base_unit || 'pcs'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 md:px-8 py-3 md:py-6 hidden md:table-cell">
                          <span className={`inline-flex items-center px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${statusColor}`}>
                            {statusIcon}
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-3 md:px-8 py-3 md:py-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 md:gap-3">
                            <button
                              onClick={() => {
                                setStockItem(item);
                                setStockUnitType(item.main_unit || item.mainUnit || 'pcs');
                              }}
                              className="group relative p-1.5 md:p-3 bg-cyan-50 text-cyan-600 hover:bg-cyan-600 hover:text-white rounded-lg md:rounded-2xl transition-all duration-300 shadow-sm overflow-hidden"
                            >
                              <Plus className="w-3.5 h-3.5 md:w-5 md:h-5 relative z-10" />
                            </button>
                            <button
                              onClick={() => setEditingItem(item)}
                              className="group relative p-1.5 md:p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg md:rounded-2xl transition-all duration-300 shadow-sm"
                            >
                              <Edit className="w-3.5 h-3.5 md:w-5 md:h-5" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="group relative p-1.5 md:p-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg md:rounded-2xl transition-all duration-300 shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-4 md:p-10 border-b border-gray-100 bg-gradient-to-b from-gray-50/50 to-white flex justify-between items-center">
            <div>
              <h3 className="text-base md:text-2xl font-black text-gray-900">Stock Update History</h3>
              <p className="text-gray-500 font-medium text-[10px] md:text-sm">Detailed log of all inventory movements and manual adjustments.</p>
            </div>
            <div className="p-2 md:p-4 bg-cyan-50 rounded-lg md:rounded-2xl">
              <History className="w-4 h-4 md:w-6 md:h-6 text-cyan-600" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Name</th>
                  <th className="px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Action</th>
                  <th className="px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Adjustment</th>
                  <th className="px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest hidden lg:table-cell">Updated By</th>
                  <th className="px-3 md:px-8 py-3 md:py-5 text-left text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventoryHistory.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 md:px-8 py-3 md:py-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-sm font-bold text-gray-900">{new Date(record.created_at).toLocaleDateString()}</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase">{new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-8 py-3 md:py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] md:text-sm font-black text-gray-900 uppercase tracking-tight truncate max-w-[100px] md:max-w-none">{record.item_name}</span>
                        <span className={`md:hidden inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest w-fit ${
                          record.action_type === 'add' ? 'bg-emerald-50 text-emerald-600' : 
                          record.action_type === 'subtract' ? 'bg-red-50 text-red-600' : 
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {record.action_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 md:px-8 py-3 md:py-6 hidden md:table-cell">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        record.action_type === 'add' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        record.action_type === 'subtract' ? 'bg-red-50 text-red-600 border-red-100' : 
                        'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {record.action_type === 'add' ? <Plus className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                        {record.action_type}
                      </span>
                    </td>
                    <td className="px-3 md:px-8 py-3 md:py-6">
                      <div className="flex flex-col">
                        <span className={`text-xs md:text-base font-black ${
                          record.action_type === 'add' ? 'text-emerald-600' : 
                          record.action_type === 'subtract' ? 'text-red-600' : 
                          'text-blue-600'
                        }`}>
                          {record.action_type === 'subtract' ? '-' : '+'}{record.change_amount}
                        </span>
                        <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{record.unit_type}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-8 py-3 md:py-6 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-cyan-100 flex items-center justify-center text-[8px] md:text-[10px] font-black text-cyan-700">
                          {record.updated_by?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs md:text-sm font-bold text-gray-600">{record.updated_by}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-8 py-3 md:py-6 hidden md:table-cell">
                      <span className="text-sm font-medium text-gray-500 italic">"{record.reason || 'No reason provided'}"</span>
                    </td>
                  </tr>
                ))}
                {inventoryHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 md:px-8 py-10 md:py-20 text-center">
                      <History className="w-8 h-8 md:w-12 md:h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">No history records found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {stockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-cyan-50 to-teal-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Update Stock</h3>
                <p className="text-sm text-gray-500 font-medium">{stockItem.name}</p>
              </div>
              <button 
                onClick={() => setStockItem(null)} 
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateStock} className="p-6 space-y-6">
              <div className="bg-cyan-50/50 p-4 rounded-xl border border-cyan-100 flex justify-between items-center">
                <span className="text-sm font-bold text-cyan-700 uppercase">Current Stock</span>
                <span className="text-lg font-black text-cyan-900">{formatQuantityDisplay(stockItem)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStockAction('add')}
                  className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    stockAction === 'add' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-[1.02]' 
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[10px] uppercase">Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockAction('subtract')}
                  className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    stockAction === 'subtract' 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-[1.02]' 
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span className="text-[10px] uppercase">Use</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockAction('set')}
                  className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    stockAction === 'set' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 scale-[1.02]' 
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-[10px] uppercase">Set</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">
                    <span>Amount</span>
                    <span className="text-cyan-600">{stockUnitType === 'pcs' ? 'Individual Pieces' : `Full ${stockUnitType}s`}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={stockAmount}
                      onChange={e => setStockAmount(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-cyan-500 rounded-2xl outline-none font-black text-2xl text-center transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Unit to Update</label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Main Unit (Box, Pack, etc) */}
                    {(stockItem.main_unit || stockItem.mainUnit) && (stockItem.main_unit !== 'piece' && stockItem.mainUnit !== 'piece') && (
                      <button
                        type="button"
                        onClick={() => setStockUnitType((stockItem.main_unit || stockItem.mainUnit)!)}
                        className={`py-3 rounded-xl text-sm font-black border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                          stockUnitType === (stockItem.main_unit || stockItem.mainUnit)
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm'
                            : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        <span>Per {(stockItem.main_unit || stockItem.mainUnit)}</span>
                      </button>
                    )}
                    
                    {/* Piece Unit (Only for vials, or if it's already a piece item) */}
                    {((stockItem.main_unit || stockItem.mainUnit) === 'vial' || 
                      stockItem.name.toLowerCase().includes('vial') || 
                      !(stockItem.main_unit || stockItem.mainUnit) || 
                      (stockItem.main_unit || stockItem.mainUnit) === 'piece') && (
                      <button
                        type="button"
                        onClick={() => setStockUnitType('pcs')}
                        className={`py-3 rounded-xl text-sm font-black border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                          stockUnitType === 'pcs'
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm'
                            : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center text-[10px]">1x</div>
                        <span>Per Piece</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase text-center block">Reason / Note</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Restock', 'Daily Use', 'Expired', 'Manual Audit'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setStockReason(r)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded-full transition-colors uppercase tracking-wider"
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea
                  value={stockReason}
                  onChange={e => setStockReason(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-sm min-h-[80px]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || stockAmount <= 0}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-2xl font-black shadow-xl shadow-cyan-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 text-lg"
              >
                {loading ? <Loader className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                Update Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-cyan-600 to-teal-600">
              <div>
                <h3 className="text-2xl font-black text-white">
                  {showAddModal ? 'New Inventory Item' : 'Edit Item'}
                </h3>
                <p className="text-cyan-50 text-sm font-medium">Fill in the details below to manage your clinic's stock.</p>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setEditingItem(null); }} 
                className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={showAddModal ? handleAddItem : handleUpdateItem} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Item Name</label>
                  <input
                    name="name"
                    defaultValue={editingItem?.name}
                    placeholder="e.g. Composite Resin A1"
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent focus:border-cyan-500 rounded-2xl transition-all outline-none font-bold text-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Category</label>
                  <select
                    name="category"
                    defaultValue={editingItem?.category || 'General'}
                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent focus:border-cyan-500 rounded-2xl transition-all outline-none font-bold text-gray-700 appearance-none"
                  >
                    <option value="General">General</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Orthodontic">Orthodontic</option>
                    <option value="Anesthesia">Anesthesia</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bought Per (Unit)</label>
                  <select
                    name="mainUnit"
                    value={selectedMainUnit}
                    onChange={(e) => setSelectedMainUnit(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent focus:border-cyan-500 rounded-2xl transition-all outline-none font-bold text-gray-700 appearance-none"
                  >
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                    <option value="vial">Vial</option>
                    <option value="piece">Individual Piece</option>
                  </select>
                </div>

                {selectedMainUnit !== 'piece' && (
                  <>
                    <div className="space-y-2 animate-in slide-in-from-left duration-300">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pieces per {selectedMainUnit}</label>
                      <input
                        name="conversionValue"
                        type="number"
                        min="2"
                        defaultValue={editingItem?.conversion_value || editingItem?.conversionValue || 10}
                        required
                        className="w-full px-5 py-3.5 bg-cyan-50 border-2 border-cyan-100 focus:border-cyan-500 rounded-2xl transition-all outline-none font-bold text-cyan-700"
                      />
                    </div>
                    <div className="space-y-2 animate-in slide-in-from-right duration-300">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Individual Unit Name</label>
                      <input
                        name="baseUnit"
                        placeholder="e.g. piece, capsule"
                        defaultValue={editingItem?.base_unit || editingItem?.baseUnit || 'piece'}
                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent focus:border-cyan-500 rounded-2xl transition-all outline-none font-bold text-gray-700"
                      />
                    </div>
                  </>
                )}

                {showAddModal && (
                  <div className="col-span-2 grid grid-cols-2 gap-6 p-6 bg-cyan-50/50 rounded-3xl border border-cyan-100">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-cyan-600 uppercase tracking-widest">Initial {selectedMainUnit}s</label>
                      <input
                        name="quantity"
                        type="number"
                        min="0"
                        required
                        className="w-full px-5 py-3.5 bg-white border-2 border-transparent focus:border-cyan-500 rounded-2xl transition-all outline-none font-black text-2xl text-cyan-900"
                      />
                    </div>
                    {selectedMainUnit !== 'piece' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-cyan-600 uppercase tracking-widest">Extra Pieces</label>
                        <input
                          name="extraPieces"
                          type="number"
                          min="0"
                          defaultValue="0"
                          className="w-full px-5 py-3.5 bg-white border-2 border-transparent focus:border-cyan-500 rounded-2xl transition-all outline-none font-black text-2xl text-cyan-900"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Min Threshold</label>
                  <input
                    name="minQuantity"
                    type="number"
                    min="1"
                    defaultValue={editingItem?.minQuantity || 5}
                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent focus:border-cyan-500 rounded-2xl transition-all outline-none font-bold text-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Supplier</label>
                  <input
                    name="supplier"
                    defaultValue={editingItem?.supplier}
                    placeholder="Supplier name"
                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent focus:border-cyan-500 rounded-2xl transition-all outline-none font-bold text-gray-700"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-cyan-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {loading ? <Loader className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  {showAddModal ? 'Create Inventory Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
