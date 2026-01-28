import { useState } from 'react';
import { InventoryItem } from '../App';
import { Package, Plus, X, Edit, AlertTriangle, Search, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryAPI } from '../api';

type InventoryManagementProps = {
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  onDataChanged?: () => Promise<void>;
};

export function InventoryManagement({ inventory, setInventory, onDataChanged }: InventoryManagementProps) {
  console.log('InventoryManagement received:', { inventory, inventoryLength: inventory.length });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['PPE', 'Medications', 'Restorative', 'Instruments', 'Equipment', 'Office Supplies'];

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const newItem = {
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        quantity: parseInt(formData.get('quantity') as string),
        minQuantity: parseInt(formData.get('minQuantity') as string),
        unit: formData.get('unit') as string,
        supplier: formData.get('supplier') as string,
        cost: parseFloat(formData.get('cost') as string),
      };
      const createdItem = await inventoryAPI.create(newItem);
      setInventory([...inventory, createdItem as InventoryItem]);
      setShowAddModal(false);
      toast.success('Item added successfully!');
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const updatedItem = {
        ...editingItem,
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        quantity: parseInt(formData.get('quantity') as string),
        minQuantity: parseInt(formData.get('minQuantity') as string),
        unit: formData.get('unit') as string,
        supplier: formData.get('supplier') as string,
        cost: parseFloat(formData.get('cost') as string),
      };

      await inventoryAPI.update(updatedItem.id, updatedItem);
      setInventory(inventory.map(item => item.id === updatedItem.id ? updatedItem : item));
      setEditingItem(null);
      toast.success('Item updated successfully!');
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryAPI.delete(id);
        setInventory(inventory.filter(item => item.id !== id));
        toast.success('Item deleted successfully!');
        // Sync data across all users
        if (onDataChanged) {
          await onDataChanged();
        }
      } catch (error) {
        console.error('Failed to delete item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  const updateQuantity = async (id: string | number, change: number) => {
    try {
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      
      const updatedItem = { ...item, quantity: Math.max(0, item.quantity + change) };
      await inventoryAPI.update(id, updatedItem);
      setInventory(inventory.map(i => i.id === id ? updatedItem : i));
      // Sync data across all users
      if (onDataChanged) {
        await onDataChanged();
      }
      toast.success('Quantity updated!');
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const reorderItem = async (id: string | number) => {
    try {
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      
      const orderQuantity = item.minQuantity * 2;
      const updatedItem = { 
        ...item, 
        quantity: item.quantity + orderQuantity, 
        lastOrdered: new Date().toISOString().split('T')[0] 
      };
      
      await inventoryAPI.update(id, updatedItem);
      setInventory(inventory.map(i => i.id === id ? updatedItem : i));
      alert(`Order placed: ${orderQuantity} ${item.unit} of ${item.name} from ${item.supplier}`);
      toast.success('Reorder completed!');
    } catch (error) {
      console.error('Failed to reorder:', error);
      toast.error('Failed to place order');
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterCategory !== 'all' && item.category !== filterCategory) {
      return false;
    }
    if (showLowStockOnly && item.quantity > item.minQuantity) {
      return false;
    }
    return true;
  });

  const lowStockCount = inventory.filter(item => item.quantity <= item.minQuantity).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * Number(item.cost || 0)), 0);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl mb-2">Inventory Management</h1>
          <p className="text-gray-600">Track and manage dental supplies</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Items</p>
          <p className="text-3xl">{inventory.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Low Stock Items</p>
          <p className="text-3xl">{lowStockCount}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Inventory Value</p>
          <p className="text-3xl">₱{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm">Low Stock Only</span>
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredInventory.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No inventory items found</p>
            <p className="text-gray-400 text-sm mt-2">Add your first item to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Item Name</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Category</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Quantity</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Min. Qty</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Supplier</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Cost/Unit</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Total Value</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const isLowStock = item.quantity <= item.minQuantity;
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-orange-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isLowStock && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        {item.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className={isLowStock ? 'text-orange-600' : ''}>
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">{item.minQuantity} {item.unit}</td>
                    <td className="px-6 py-4 text-sm">{item.supplier}</td>
                    <td className="px-6 py-4">₱{Number(item.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">₱{(item.quantity * Number(item.cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red-600 hover:text-red-700"
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

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl">Add Inventory Item</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Item Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Category *</label>
                  <select
                    name="category"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Unit *</label>
                  <select
                    name="unit"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="piece">Piece</option>
                    <option value="box">Box</option>
                    <option value="vial">Vial</option>
                    <option value="syringe">Syringe</option>
                    <option value="bottle">Bottle</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Min. Quantity *</label>
                  <input
                    type="number"
                    name="minQuantity"
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Supplier *</label>
                <input
                  type="text"
                  name="supplier"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Cost per Unit (₱) *</label>
                <input
                  type="number"
                  name="cost"
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
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
              <h2 className="text-2xl">Edit Inventory Item</h2>
              <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Item Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingItem.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Category *</label>
                  <select
                    name="category"
                    required
                    defaultValue={editingItem.category}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Unit *</label>
                  <select
                    name="unit"
                    required
                    defaultValue={editingItem.unit}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="piece">Piece</option>
                    <option value="box">Box</option>
                    <option value="vial">Vial</option>
                    <option value="syringe">Syringe</option>
                    <option value="bottle">Bottle</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="0"
                    defaultValue={editingItem.quantity}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Min. Quantity *</label>
                  <input
                    type="number"
                    name="minQuantity"
                    required
                    min="0"
                    defaultValue={editingItem.minQuantity}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Supplier *</label>
                <input
                  type="text"
                  name="supplier"
                  required
                  defaultValue={editingItem.supplier}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Cost per Unit (₱) *</label>
                <input
                  type="number"
                  name="cost"
                  required
                  step="0.01"
                  min="0"
                  defaultValue={editingItem.cost}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
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
