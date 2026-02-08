// Reduce inventory for multiple services
import { inventoryManagementAPI, inventoryAPI } from '../api';
export async function reduceInventoryForServices(serviceNames: DentalService[], inventory: InventoryItem[], setInventory: (inventory: InventoryItem[]) => void, onDataChanged?: () => Promise<void>) {
  const normalizeBoxFields = (item: any) => {
    if (item.unit_type !== 'box') return;
    const ppb = Math.max(0, Number(item.pieces_per_box || 0));
    if (ppb <= 0) return;
    if (item.quantity > 0 && (item.remaining_pieces == null || !Number.isFinite(Number(item.remaining_pieces)))) {
      item.remaining_pieces = ppb;
    }
    if (item.quantity <= 0) {
      item.remaining_pieces = 0;
    }
    if (Number(item.remaining_pieces) > ppb) item.remaining_pieces = ppb;
    if (Number(item.remaining_pieces) < 0) item.remaining_pieces = 0;
  };

  const getAvailablePieces = (item: any) => {
    if (item.unit_type !== 'box') return Math.max(0, Number(item.quantity || 0));
    const ppb = Math.max(0, Number(item.pieces_per_box || 0));
    const boxes = Math.max(0, Number(item.quantity || 0));
    if (boxes <= 0 || ppb <= 0) return 0;
    const rem = Math.max(0, Number(item.remaining_pieces == null ? ppb : item.remaining_pieces));
    return (boxes - 1) * ppb + Math.min(rem, ppb);
  };

  const reduceInventoryItemByPiecesStrict = async (inventoryItem: any, piecesToReduce: number) => {
    if (!inventoryItem) return false;
    const pieces = Math.max(0, Number(piecesToReduce || 0));
    if (pieces === 0) return true;

    if (inventoryItem.unit_type === 'box') {
      normalizeBoxFields(inventoryItem);
      const ppb = Math.max(0, Number(inventoryItem.pieces_per_box || 0));
      let boxes = Math.max(0, Number(inventoryItem.quantity || 0));
      if (boxes <= 0 || ppb <= 0) return false;
      let rem = Math.max(0, Number(inventoryItem.remaining_pieces == null ? ppb : inventoryItem.remaining_pieces));
      if (rem > ppb) rem = ppb;

      const available = getAvailablePieces(inventoryItem);
      if (available < pieces) return false;

      let left = pieces;
      while (left > 0 && boxes > 0) {
        const used = Math.min(rem, left);
        rem -= used;
        left -= used;
        if (rem === 0) {
          boxes -= 1;
          if (boxes > 0) rem = ppb;
        }
      }
      if (boxes === 0) rem = 0;

      inventoryItem.quantity = boxes;
      inventoryItem.remaining_pieces = rem;
      try {
        await inventoryAPI.update(inventoryItem.id, inventoryItem);
        return true;
      } catch {
        return false;
      }
    }

    inventoryItem.quantity = Math.max(0, Number(inventoryItem.quantity || 0) - pieces);
    try {
      await inventoryAPI.update(inventoryItem.id, inventoryItem);
      return true;
    } catch {
      return false;
    }
  };

  let reductionCount = 0;
  for (const serviceName of serviceNames) {
    // Attempt to use backend rules first
    let ruleItems: any[] | null = null;
    try {
      const allRules = await inventoryManagementAPI.getAutoReductionRules().catch(() => null);
      if (allRules && Array.isArray(allRules)) {
        const found = allRules.find((r: any) => String(r.appointmentType) === String(serviceName));
        if (found) ruleItems = found.items || found;
      }
    } catch (err) {
      ruleItems = null;
    }

    const updatedInventory = [...inventory];

    if (ruleItems && ruleItems.length > 0) {
      for (const rItem of ruleItems) {
        const itemId = rItem.inventoryItemId ?? rItem.itemId;
        const inventoryItem = updatedInventory.find(i => i.id === itemId);
        if (!inventoryItem) continue;

        const qtyToReduce = Number(rItem.quantityToReduce || 0);

        const ok = await reduceInventoryItemByPiecesStrict(inventoryItem, qtyToReduce);
        if (ok) reductionCount++;
      }
    } else {
      // fallback static mapping: subtract 1 per mapped item
      const itemsNeeded = SERVICE_INVENTORY_MAP[serviceName];
      if (!itemsNeeded || itemsNeeded.length === 0) continue;
      for (const itemType of itemsNeeded) {
        const item = updatedInventory.find(i => i.name.toUpperCase().includes(itemType.replace(/_/g, ' ')));
        if (item && item.quantity > 0) {
          const ok = await reduceInventoryItemByPiecesStrict(item, 1);
          if (ok) reductionCount++;
        }
      }
    }

    setInventory(updatedInventory);
    if (onDataChanged) await onDataChanged();
  }
  return reductionCount;
}
import { useState } from 'react';
import { InventoryItem } from '../App';
import { Package, Plus, X, Edit, Search, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Inventory Item Types
type InventoryItemType = 
  | 'COTTON_ROLLS'
  | 'COTTON_BALLS'
  | 'ANESTHESIA'
  | 'NEEDLE'
  | 'DENTAL_BIB'
  | 'TISSUE'
  | 'GLOVES'
  | 'CUPS'
  | 'FACE_MASK'
  | 'PASTE'
  | 'BRUSH'
  | 'MOUTH_WASH';

// Service Type Definition
type DentalService = 'ANESTHESIA' | 'PROPHYLAXIS' | 'BRACES' | 'EXTRACTION' | 'FILLING' | string;

// Service to Items Mapping
type ServiceInventoryMap = {
  [key in DentalService]: InventoryItemType[];
};

// Service Definitions - Map each service to items it uses
const SERVICE_INVENTORY_MAP: ServiceInventoryMap = {
  'ANESTHESIA': ['COTTON_BALLS', 'ANESTHESIA', 'NEEDLE', 'DENTAL_BIB', 'TISSUE', 'GLOVES', 'CUPS', 'FACE_MASK'],
  'PROPHYLAXIS': ['COTTON_BALLS', 'PASTE', 'BRUSH', 'MOUTH_WASH', 'DENTAL_BIB', 'GLOVES'],
  'BRACES': ['COTTON_BALLS', 'DENTAL_BIB', 'TISSUE', 'GLOVES', 'FACE_MASK', 'CUPS'],
  'EXTRACTION': ['COTTON_BALLS', 'ANESTHESIA', 'NEEDLE', 'DENTAL_BIB', 'TISSUE', 'GLOVES', 'CUPS', 'FACE_MASK'],
  'FILLING': ['COTTON_BALLS', 'DENTAL_BIB', 'TISSUE', 'GLOVES', 'CUPS', 'FACE_MASK', 'PASTE'],
  'SCALING': ['COTTON_BALLS', 'PASTE', 'BRUSH', 'MOUTH_WASH', 'DENTAL_BIB', 'GLOVES', 'CUPS'],
  'ROOT_CANAL': ['COTTON_ROLLS', 'COTTON_BALLS', 'ANESTHESIA', 'NEEDLE', 'DENTAL_BIB', 'TISSUE', 'GLOVES', 'CUPS', 'FACE_MASK'],
  'CROWN_PREP': ['COTTON_BALLS', 'ANESTHESIA', 'NEEDLE', 'DENTAL_BIB', 'TISSUE', 'GLOVES', 'CUPS', 'FACE_MASK', 'PASTE'],
  'BONDING': ['COTTON_BALLS', 'PASTE', 'DENTAL_BIB', 'TISSUE', 'GLOVES', 'CUPS', 'FACE_MASK'],
  'WHITENING': ['COTTON_BALLS', 'PASTE', 'DENTAL_BIB', 'GLOVES', 'CUPS', 'FACE_MASK'],
  'CLEANING': ['COTTON_BALLS', 'PASTE', 'BRUSH', 'MOUTH_WASH', 'DENTAL_BIB', 'GLOVES', 'CUPS'],
  'IMPLANT_PREP': ['COTTON_ROLLS', 'COTTON_BALLS', 'ANESTHESIA', 'NEEDLE', 'DENTAL_BIB', 'TISSUE', 'GLOVES', 'CUPS', 'FACE_MASK'],
};

// Service Display Names
const SERVICE_DISPLAY_NAMES: { [key: string]: string } = {
  'ANESTHESIA': 'Local Anesthetic / Anesthesia',
  'PROPHYLAXIS': 'Teeth Cleaning / Prophylaxis',
  'BRACES': 'Orthodontic Adjustment / Braces',
  'EXTRACTION': 'Tooth Extraction',
  'FILLING': 'Filling / Restoration',
  'SCALING': 'Scaling & Root Planing',
  'ROOT_CANAL': 'Root Canal Treatment',
  'CROWN_PREP': 'Crown Preparation',
  'BONDING': 'Composite Bonding',
  'WHITENING': 'Teeth Whitening',
  'CLEANING': 'Professional Cleaning',
  'IMPLANT_PREP': 'Implant Preparation',
};

// Item Display Names
const ITEM_DISPLAY_NAMES: { [key in InventoryItemType]: string } = {
  'COTTON_ROLLS': 'Cotton Rolls',
  'COTTON_BALLS': 'Cotton Balls',
  'ANESTHESIA': 'Anesthetic Solution',
  'NEEDLE': 'Needle',
  'DENTAL_BIB': 'Dental Bib',
  'TISSUE': 'Tissue',
  'GLOVES': 'Gloves',
  'CUPS': 'Cups',
  'FACE_MASK': 'Face Mask',
  'PASTE': 'Toothpaste',
  'BRUSH': 'Toothbrush',
  'MOUTH_WASH': 'Mouth Wash',
};

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
  const [activeTab, setActiveTab] = useState<'inventory' | 'services'>('inventory');
  const [selectedService, setSelectedService] = useState<DentalService>('ANESTHESIA');
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceItems, setCustomServiceItems] = useState<InventoryItemType[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);

  // Default inventory items to seed
  const DEFAULT_INVENTORY_ITEMS = [
    { name: 'Cotton Rolls', quantity: 100, unit: 'piece' },
    { name: 'Cotton Balls', quantity: 200, unit: 'piece' },
    { name: 'Anesthetic Solution', quantity: 50, unit: 'vial' },
    { name: 'Needle', quantity: 150, unit: 'piece' },
    { name: 'Dental Bib', quantity: 300, unit: 'piece' },
    { name: 'Tissue', quantity: 250, unit: 'box' },
    { name: 'Gloves', quantity: 500, unit: 'pair' },
    { name: 'Cups', quantity: 400, unit: 'piece' },
    { name: 'Face Mask', quantity: 350, unit: 'piece' },
    { name: 'Toothpaste', quantity: 75, unit: 'tube' },
    { name: 'Toothbrush', quantity: 60, unit: 'piece' },
    { name: 'Mouth Wash', quantity: 40, unit: 'bottle' },
  ];

  const handleInitializeInventory = async () => {
    setIsInitializing(true);
    try {
      const newItems = [];
      const failedItems = [];
      
      for (const item of DEFAULT_INVENTORY_ITEMS) {
        try {
          const createdItem = await inventoryAPI.create(item);
          newItems.push(createdItem as InventoryItem);
        } catch (error) {
          console.error(`Failed to add ${item.name}:`, error);
          failedItems.push(item.name);
        }
      }
      
      if (newItems.length > 0) {
        setInventory([...inventory, ...newItems]);
        if (onDataChanged) {
          await onDataChanged();
        }
      }
      
      if (failedItems.length > 0) {
        toast.warning(`Added ${newItems.length} items. Failed: ${failedItems.join(', ')}`);
      } else {
        toast.success(`Successfully added all ${newItems.length} inventory items!`);
      }
    } catch (error) {
      console.error('Failed to initialize inventory:', error);
      toast.error('Failed to add inventory items');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const unitType = (formData.get('unit_type') as string) || 'piece';
      const piecesPerBox = formData.get('pieces_per_box') ? Number(formData.get('pieces_per_box')) : undefined;
      const remainingPieces = formData.get('remaining_pieces') ? Number(formData.get('remaining_pieces')) : undefined;

      const newItem = {
        name: formData.get('name') as string,
        quantity: parseInt(formData.get('quantity') as string),
        unit: formData.get('unit') as string,
        unit_type: unitType as any,
        pieces_per_box: unitType === 'box' ? piecesPerBox : undefined,
        remaining_pieces: unitType === 'box' ? remainingPieces : undefined,
        minQuantity: formData.get('minQuantity') ? Number(formData.get('minQuantity')) : 0,
      };

      if (newItem.unit_type === 'box' && newItem.quantity > 0 && newItem.pieces_per_box && (newItem.remaining_pieces == null || Number.isNaN(Number(newItem.remaining_pieces)))) {
        newItem.remaining_pieces = newItem.pieces_per_box;
      }
      if (newItem.unit_type === 'box' && (!newItem.pieces_per_box || Number(newItem.pieces_per_box) <= 0)) {
        toast.error('Pieces per box is required for box-tracked items');
        return;
      }

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
    }
  };

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const formData = new FormData(e.currentTarget);
      const unitType = (formData.get('unit_type') as string) || (editingItem.unit_type as any) || 'piece';
      const piecesPerBox = formData.get('pieces_per_box') ? Number(formData.get('pieces_per_box')) : editingItem.pieces_per_box;
      const remainingPieces = formData.get('remaining_pieces') ? Number(formData.get('remaining_pieces')) : editingItem.remaining_pieces;

      const updatedItem = {
        ...editingItem,
        name: formData.get('name') as string,
        quantity: parseInt(formData.get('quantity') as string),
        unit: formData.get('unit') as string,
        unit_type: unitType as any,
        pieces_per_box: unitType === 'box' ? piecesPerBox : undefined,
        remaining_pieces: unitType === 'box' ? remainingPieces : undefined,
        minQuantity: formData.get('minQuantity') ? Number(formData.get('minQuantity')) : (editingItem.minQuantity || 0),
      };

      if (updatedItem.unit_type === 'box' && (!updatedItem.pieces_per_box || Number(updatedItem.pieces_per_box) <= 0)) {
        toast.error('Pieces per box is required for box-tracked items');
        return;
      }
      if (updatedItem.unit_type === 'box') {
        const ppb = Number(updatedItem.pieces_per_box || 0);
        if (updatedItem.quantity > 0 && (updatedItem.remaining_pieces == null || !Number.isFinite(Number(updatedItem.remaining_pieces)))) {
          updatedItem.remaining_pieces = ppb;
        }
        if (updatedItem.quantity <= 0) {
          updatedItem.remaining_pieces = 0;
        }
        if (Number(updatedItem.remaining_pieces) > ppb) updatedItem.remaining_pieces = ppb;
        if (Number(updatedItem.remaining_pieces) < 0) updatedItem.remaining_pieces = 0;
      }

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

      const updatedItem: any = { ...item, quantity: Math.max(0, item.quantity + change) };
      if (updatedItem.unit_type === 'box') {
        const ppb = Math.max(0, Number(updatedItem.pieces_per_box || 0));
        if (updatedItem.quantity === 0) {
          updatedItem.remaining_pieces = 0;
        } else if (ppb > 0 && (updatedItem.remaining_pieces == null || Number(updatedItem.remaining_pieces) === 0)) {
          updatedItem.remaining_pieces = ppb;
        }
        if (ppb > 0 && Number(updatedItem.remaining_pieces) > ppb) updatedItem.remaining_pieces = ppb;
      }
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

  // Get inventory item by name
  const getInventoryItemByName = (itemType: InventoryItemType): InventoryItem | undefined => {
    return inventory.find(item => item.name.toUpperCase().includes(itemType.replace(/_/g, ' ')));
  };

  // Helper: reduce an inventory item by a number of pieces, respecting boxes and remainderPieces
  const reduceInventoryItemByPieces = async (inventoryItem: any, piecesToReduce: number) => {
    if (!inventoryItem) return false;

    const pieces = Math.max(0, Number(piecesToReduce || 0));
    if (pieces === 0) return true;

    if (inventoryItem.unit_type === 'box') {
      const ppb = Math.max(0, Number(inventoryItem.pieces_per_box || 0));
      let boxes = Math.max(0, Number(inventoryItem.quantity || 0));
      if (ppb <= 0 || boxes <= 0) return false;
      let rem = inventoryItem.remaining_pieces == null ? ppb : Number(inventoryItem.remaining_pieces);
      if (!Number.isFinite(rem) || rem < 0) rem = ppb;
      if (rem > ppb) rem = ppb;

      const available = (boxes - 1) * ppb + rem;
      if (available < pieces) return false;

      let left = pieces;
      while (left > 0 && boxes > 0) {
        const used = Math.min(rem, left);
        rem -= used;
        left -= used;
        if (rem === 0) {
          boxes -= 1;
          if (boxes > 0) rem = ppb;
        }
      }
      if (boxes === 0) rem = 0;

      inventoryItem.quantity = boxes;
      inventoryItem.remaining_pieces = rem;

      try {
        await inventoryAPI.update(inventoryItem.id, inventoryItem);
        return true;
      } catch (error) {
        console.error('Failed to update boxed inventory item:', error);
        return false;
      }
    }

    inventoryItem.quantity = Math.max(0, Number(inventoryItem.quantity || 0) - pieces);
    try {
      await inventoryAPI.update(inventoryItem.id, inventoryItem);
      return true;
    } catch (error) {
      console.error('Failed to update inventory item:', error);
      return false;
    }
  };

  // Helper: fetch backend auto-reduction rule items for a service (if any)
  const getAutoReductionRuleForService = async (serviceName: DentalService) => {
    try {
      const allRules = await inventoryManagementAPI.getAutoReductionRules().catch(() => null);
      if (allRules && Array.isArray(allRules)) {
        const found = allRules.find((r: any) => String(r.appointmentType) === String(serviceName));
        if (found) return found.items || found;
      }
    } catch (err) {
      // ignore
    }
    return null;
  };

  // Execute a service and deduct inventory
  const executeService = async (serviceName: DentalService, quantity: number = 1) => {
    // Try backend rule first
    const ruleItems: any[] | null = await getAutoReductionRuleForService(serviceName);

    const updatedInventory = [...inventory];

    if (ruleItems && ruleItems.length > 0) {
      // Validate stock based on rule quantities (rule quantity is per procedure)
      const outOfStock: string[] = [];
      const lowStock: string[] = [];

      for (const rItem of ruleItems) {
        const itemId = rItem.inventoryItemId ?? rItem.itemId;
        const qtyPerProcedure = Number(rItem.quantityToReduce || 0);
        const totalNeeded = qtyPerProcedure * quantity;
        const inventoryItem = updatedInventory.find(i => i.id === itemId);
        if (!inventoryItem) {
          outOfStock.push(rItem.itemName || `Item ${itemId}`);
          continue;
        }

        if (inventoryItem.unit_type === 'box') {
          const ppb = Number(inventoryItem.pieces_per_box || 0);
          const boxes = Number(inventoryItem.quantity || 0);
          const rem = Number(inventoryItem.remaining_pieces == null ? ppb : inventoryItem.remaining_pieces);
          const availablePieces = boxes > 0 && ppb > 0 ? ((boxes - 1) * ppb + Math.min(rem, ppb)) : 0;
          if (availablePieces < totalNeeded) {
            outOfStock.push(inventoryItem.name + ` (need ${totalNeeded} pcs, have ${availablePieces} pcs)`);
          } else if (availablePieces - totalNeeded <= (inventoryItem.minQuantity || 0) * ppb) {
            lowStock.push(inventoryItem.name);
          }
        } else {
          if (Number(inventoryItem.quantity || 0) < totalNeeded) {
            outOfStock.push(inventoryItem.name + ` (need ${totalNeeded}, have ${inventoryItem.quantity})`);
          } else if (Number(inventoryItem.quantity || 0) - totalNeeded <= (inventoryItem.minQuantity || 0)) {
            lowStock.push(inventoryItem.name);
          }
        }
      }

      if (outOfStock.length > 0) {
        toast.error(`OUT OF STOCK: ${outOfStock.join(', ')}`);
        return false;
      }

      if (lowStock.length > 0) {
        toast.warning(`LOW STOCK WARNING: ${lowStock.join(', ')}`);
      }

      // Perform actual reduction
      for (const rItem of ruleItems) {
        const itemId = rItem.inventoryItemId ?? rItem.itemId;
        const qtyPerProcedure = Number(rItem.quantityToReduce || 0);
        const totalNeeded = qtyPerProcedure * quantity;
        const inventoryItem = updatedInventory.find(i => i.id === itemId);
        if (!inventoryItem) continue;

        const ok = await reduceInventoryItemByPieces(inventoryItem, totalNeeded);
        if (!ok) {
          toast.error(`Failed to deduct ${inventoryItem.name}`);
          return false;
        }
      }

      setInventory(updatedInventory);
      if (onDataChanged) await onDataChanged();

      const serviceName_display = SERVICE_DISPLAY_NAMES[serviceName] || serviceName;
      toast.success(`${serviceName_display} completed! Inventory updated.`);
      return true;
    }

    // Fallback: use static mapping but apply boxed logic (reduce pieces where applicable)
    const itemsNeeded = SERVICE_INVENTORY_MAP[serviceName];
    if (!itemsNeeded || itemsNeeded.length === 0) {
      toast.error('No items configured for this service');
      return false;
    }

    const outOfStockItems: string[] = [];
    const lowStockItems: string[] = [];

    // validate
    for (const itemType of itemsNeeded) {
      const item = updatedInventory.find(i => i.name.toUpperCase().includes(itemType.replace(/_/g, ' ')));
      if (!item) {
        outOfStockItems.push(ITEM_DISPLAY_NAMES[itemType]);
        continue;
      }
      const neededPieces = quantity; // default 1 piece per procedure per mapping
      if (item.unit_type === 'box') {
        const ppb = Number(item.pieces_per_box || 0);
        const boxes = Number(item.quantity || 0);
        const rem = Number(item.remaining_pieces == null ? ppb : item.remaining_pieces);
        const availablePieces = boxes > 0 && ppb > 0 ? ((boxes - 1) * ppb + Math.min(rem, ppb)) : 0;
        if (availablePieces < neededPieces) outOfStockItems.push(item.name);
        else if (availablePieces - neededPieces <= (item.minQuantity || 0) * ppb) lowStockItems.push(item.name);
      } else {
        if (Number(item.quantity || 0) < neededPieces) outOfStockItems.push(item.name);
        else if (Number(item.quantity || 0) - neededPieces <= (item.minQuantity || 0)) lowStockItems.push(item.name);
      }
    }

    if (outOfStockItems.length > 0) {
      toast.error(`OUT OF STOCK: ${outOfStockItems.join(', ')}`);
      return false;
    }

    if (lowStockItems.length > 0) {
      toast.warning(`LOW STOCK WARNING: ${lowStockItems.join(', ')}`);
    }

    // deduct
    for (const itemType of itemsNeeded) {
      const item = updatedInventory.find(i => i.name.toUpperCase().includes(itemType.replace(/_/g, ' ')));
      if (!item) continue;
      const ok = await reduceInventoryItemByPieces(item, quantity);
      if (!ok) {
        toast.error(`Failed to deduct ${item.name}`);
        return false;
      }
    }

    setInventory(updatedInventory);
    if (onDataChanged) await onDataChanged();

    const serviceName_display = SERVICE_DISPLAY_NAMES[serviceName] || serviceName;
    toast.success(`${serviceName_display} completed! Inventory updated.`);
    return true;
  };

  // Execute custom service
  const executeCustomService = async (quantity: number = 1) => {
    if (!customServiceName.trim() || customServiceItems.length === 0) {
      toast.error('Please enter service name and select items');
      return;
    }

    // Deduct items (use boxed logic when applicable)
    const updatedInventory = [...inventory];

    // Validate stock first
    const outOfStockItems: string[] = [];
    for (const itemType of customServiceItems) {
      const item = updatedInventory.find(i => i.name.toUpperCase().includes(itemType.replace(/_/g, ' ')));
      if (!item) {
        outOfStockItems.push(ITEM_DISPLAY_NAMES[itemType]);
        continue;
      }
      const needed = quantity;
      if (item.unit_type === 'box') {
        const ppb = Number(item.pieces_per_box || 0);
        const boxes = Number(item.quantity || 0);
        const rem = Number(item.remaining_pieces == null ? ppb : item.remaining_pieces);
        const availablePieces = boxes > 0 && ppb > 0 ? ((boxes - 1) * ppb + Math.min(rem, ppb)) : 0;
        if (availablePieces < needed) outOfStockItems.push(`${item.name} (need ${needed} pcs, have ${availablePieces} pcs)`);
      } else {
        if (Number(item.quantity || 0) < needed) outOfStockItems.push(`${item.name} (need ${needed}, have ${item.quantity})`);
      }
    }

    if (outOfStockItems.length > 0) {
      toast.error(`OUT OF STOCK: ${outOfStockItems.join(', ')}`);
      return;
    }

    for (const itemType of customServiceItems) {
      const item = updatedInventory.find(i => i.name.toUpperCase().includes(itemType.replace(/_/g, ' ')));
      if (!item) continue;
      const ok = await reduceInventoryItemByPieces(item, quantity);
      if (!ok) {
        toast.error(`Failed to deduct ${item.name}`);
        return;
      }
    }

    setInventory(updatedInventory);
    if (onDataChanged) {
      await onDataChanged();
    }

    toast.success(`${customServiceName} completed! Inventory updated.`);
    setCustomServiceName('');
    setCustomServiceItems([]);
    setShowServiceModal(false);
  };


  const filteredInventory = inventory.filter(item => {
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-8">
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'inventory'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Inventory Management
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'services'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Services & Procedures
        </button>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Service Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-6">Execute Dental Service</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Select Service</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value as DentalService)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ANESTHESIA">Local Anesthetic / Anesthesia</option>
                  <option value="PROPHYLAXIS">Teeth Cleaning / Prophylaxis</option>
                  <option value="BRACES">Orthodontic Adjustment / Braces</option>
                  <option value="EXTRACTION">Tooth Extraction</option>
                  <option value="FILLING">Filling / Restoration</option>
                  <option value="SCALING">Scaling & Root Planing</option>
                  <option value="ROOT_CANAL">Root Canal Treatment</option>
                  <option value="CROWN_PREP">Crown Preparation</option>
                  <option value="BONDING">Composite Bonding</option>
                  <option value="WHITENING">Teeth Whitening</option>
                  <option value="CLEANING">Professional Cleaning</option>
                  <option value="IMPLANT_PREP">Implant Preparation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Number of Procedures</label>
                <input
                  type="number"
                  min="1"
                  value={serviceQuantity}
                  onChange={(e) => setServiceQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Service Items List */}
              <div>
                <label className="block text-sm font-medium mb-3">Items Used</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {SERVICE_INVENTORY_MAP[selectedService]?.map((itemType) => {
                    const item = getInventoryItemByName(itemType);
                    const needed = serviceQuantity;
                    const isOutOfStock = !item || (item.unit_type === 'box'
                      ? (() => {
                          const ppb = Number(item.pieces_per_box || 0);
                          const boxes = Number(item.quantity || 0);
                          const rem = Number(item.remaining_pieces == null ? ppb : item.remaining_pieces);
                          const availablePieces = boxes > 0 && ppb > 0 ? ((boxes - 1) * ppb + Math.min(rem, ppb)) : 0;
                          return availablePieces < needed;
                        })()
                      : (Number(item.quantity || 0) < needed));
                    
                    return (
                      <div key={itemType} className={`flex justify-between p-2 rounded ${isOutOfStock ? 'bg-red-100' : 'bg-white'}`}>
                        <span className={isOutOfStock ? 'text-red-700 font-medium' : 'text-gray-700'}>
                          {ITEM_DISPLAY_NAMES[itemType]}
                        </span>
                        <span className={`font-medium ${isOutOfStock ? 'text-red-700' : 'text-gray-700'}`}>
                          {item
                            ? (item.unit_type === 'box'
                                ? (() => {
                                    const ppb = Number(item.pieces_per_box || 0);
                                    const boxes = Number(item.quantity || 0);
                                    const rem = Number(item.remaining_pieces == null ? ppb : item.remaining_pieces);
                                    const availablePieces = boxes > 0 && ppb > 0 ? ((boxes - 1) * ppb + Math.min(rem, ppb)) : 0;
                                    return `${availablePieces} pcs available (${item.quantity} box${item.quantity !== 1 ? 'es' : ''})`;
                                  })()
                                : `${item.quantity} available`)
                            : '0 available'} (need {needed})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => executeService(selectedService, serviceQuantity)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Execute Service
              </button>
            </div>

            {/* Custom Service Button */}
            <button
              onClick={() => setShowServiceModal(true)}
              className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create Custom Service
            </button>
          </div>

          {/* Service Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Out of Stock Items</p>
              <p className="text-3xl">
                {inventory.filter(item => item.quantity === 0).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="p-8 space-y-6">
          {/* Header Section */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Inventory</h2>
              <p className="text-gray-600 mt-2">Manage and track clinic supplies and materials</p>
            </div>
            <div className="flex gap-3">
              {inventory.length === 0 && (
                <button
                  onClick={handleInitializeInventory}
                  disabled={isInitializing}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">{isInitializing ? 'Loading...' : 'Initialize Items'}</span>
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Add New Item</span>
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{inventory.length}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-lg">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">In Stock</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{inventory.filter(item => item.quantity > 0).length}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-lg">
                  <Package className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Out of Stock</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{inventory.filter(item => item.quantity === 0).length}</p>
                </div>
                <div className="p-3 bg-red-200 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search inventory items by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              />
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredInventory.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No inventory items found</p>
                <p className="text-gray-400 mt-1">Add your first item to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Item Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Unit</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInventory.map((item) => {
                      const isOutOfStock = item.quantity === 0;
                      return (
                        <tr key={item.id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-colors ${isOutOfStock ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-green-500'}`}></div>
                              <span className={`font-medium ${isOutOfStock ? 'text-red-900' : 'text-gray-900'}`}>{item.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-semibold transition-colors"
                              >
                                −
                              </button>
                              <span className={`font-semibold w-8 text-center ${isOutOfStock ? 'text-red-600' : 'text-gray-900'}`}>
                                {item.unit_type === 'box'
                                  ? `${item.quantity} box${item.quantity !== 1 ? 'es' : ''}`
                                  : `${item.quantity}`}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-semibold transition-colors"
                              >
                                +
                              </button>
                            </div>
                            {item.unit_type === 'box' && (
                              <div className="text-sm text-gray-500 mt-1">
                                {`${item.quantity} boxes | ${item.pieces_per_box ?? '—'} pcs/box | ${item.remaining_pieces ?? 0} pcs remaining`}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">{item.unit}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-3">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                title="Edit item"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                title="Delete item"
                              >
                                <X className="w-5 h-5" />
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
              <div>
                <label className="block text-sm mb-1">Unit Type *</label>
                <select
                  name="unit_type"
                  required
                  defaultValue="piece"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="piece">Piece</option>
                  <option value="box">Box</option>
                </select>
              </div>
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
                <label className="block text-sm mb-1">Pieces Per Box</label>
                <input
                  type="number"
                  name="pieces_per_box"
                  min="0"
                  placeholder="e.g., 40"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Remaining Pieces (Current Box)</label>
                <input
                  type="number"
                  name="remaining_pieces"
                  min="0"
                  placeholder="e.g., 40"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Minimum Quantity Warning Threshold (optional)</label>
                <input
                  type="number"
                  name="minQuantity"
                  min="0"
                  placeholder="e.g., 5"
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
              <div>
                <label className="block text-sm mb-1">Unit Type *</label>
                <select
                  name="unit_type"
                  required
                  defaultValue={editingItem.unit_type || 'piece'}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="piece">Piece</option>
                  <option value="box">Box</option>
                </select>
              </div>
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
                <label className="block text-sm mb-1">Pieces Per Box</label>
                <input
                  type="number"
                  name="pieces_per_box"
                  min="0"
                  defaultValue={editingItem.pieces_per_box}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Remaining Pieces (Current Box)</label>
                <input
                  type="number"
                  name="remaining_pieces"
                  min="0"
                  defaultValue={editingItem.remaining_pieces || 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Minimum Quantity Warning Threshold (optional)</label>
                <input
                  type="number"
                  name="minQuantity"
                  min="0"
                  defaultValue={editingItem.minQuantity || 0}
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

      {/* Custom Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Create Custom Service</h2>
              <button onClick={() => setShowServiceModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Service Name *</label>
                <input
                  type="text"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  placeholder="e.g., Crown Preparation"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Select Items Used</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(ITEM_DISPLAY_NAMES).map(([key, displayName]) => (
                    <label key={key} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customServiceItems.includes(key as InventoryItemType)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomServiceItems([...customServiceItems, key as InventoryItemType]);
                          } else {
                            setCustomServiceItems(customServiceItems.filter(item => item !== key));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-gray-700">{displayName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Selected Items:</strong> {customServiceItems.length > 0 ? customServiceItems.map(item => ITEM_DISPLAY_NAMES[item]).join(', ') : 'None selected'}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeCustomService(1)}
                  disabled={!customServiceName.trim() || customServiceItems.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Create & Execute Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
