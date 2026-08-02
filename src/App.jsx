import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash2, Download, Printer, Send, FileText, Receipt } from 'lucide-react';

// REPLACE WITH YOUR SUPABASE KEYS
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const LOGO_URL = '/Eby-Gold-inv-New/logo.png'; 

function numberToWords(num) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (num === 0) return 'Zero Naira Only';
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10? ' ' + a[n%10] : '');
    if (n < 1000) return a[Math.floor(n/100)] + ' Hundred ' + inWords(n%100);
    if (n < 1000000) return inWords(Math.floor(n/1000)) + ' Thousand ' + inWords(n%1000);
    return inWords(Math.floor(n/1000000)) + ' Million ' + inWords(n%1000000);
  }
  return inWords(Math.floor(num)).trim() + ' Naira Only';
}

export default function App() {
  const [mode, setMode] = useState('invoice');
  const [customers, setCustomers] = useState(JSON.parse(localStorage.getItem('eby_customers') || '[]'));
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{id:1, name:'', qty:1, price:0, stock:0}]);
  const [customer, setCustomer] = useState({name:'', phone:'', address:''});
  const [discount, setDiscount] = useState(0);
  const [paymentInfo, setPaymentInfo] = useState(JSON.parse(localStorage.getItem('eby_payment') || '{"bank":"UBA","accountName":"Eby-Gold Superstores","accountNo":"1023456789"}'));
  const [currentUser, setCurrentUser] = useState('Admin');
  const invoiceRef = useRef();

  useEffect(() => { localStorage.setItem('eby_customers', JSON.stringify(customers)) }, [customers]);
  useEffect(() => { localStorage.setItem('eby_payment', JSON.stringify(paymentInfo)) }, [paymentInfo]);
  
  useEffect(() => {
    supabase.from('products').select('*').then(({data}) => setProducts(data || []));
  }, []);

  const addItem = () => setItems([...items, {id:Date.now(), name:'', qty:1, price:0, stock:0}]);
  const removeItem = (id) => setItems(items.filter(i => i.id!== id));
  
  const updateItem = (id, field, value) => {
    setItems(items.map(i => {
      if(i.id === id) {
        const updated = {...i, [field]: value};
        if(field === 'name') {
          const prod = products.find(p => p.name === value);
          if(prod) { updated.price = prod.price; updated.stock = prod.stock; }
        }
        if(field === 'qty' && updated.qty > updated.stock && updated.stock > 0) {
          alert(`Only ${updated.stock} left in stock`);
          updated.qty = updated.stock;
        }
        return updated;
      }
      return i;
    }));
  }

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const total = subtotal - discount;

  const downloadPDF = async () => {
    const canvas = await html2canvas(invoiceRef.current, {scale:2, backgroundColor:'#fff', useCORS:true});
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p','mm','a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`EbyGold-${customer.name || 'Invoice'}-${Date.now()}.pdf`);
  }

  const sendWhatsApp = async () => {
    await downloadPDF();
    const phone = customer.phone.replace(/\D/g,'').replace(/^0/, '234');
    const msg = `Hi ${customer.name}, Please find your Eby-Gold Superstores Invoice attached.\nTotal: ₦${total.toLocaleString()}\nThank you for your business!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="min-h-screen bg-gray-100 p-2 md:p-4">
      {/* CONTROLS - NO PRINT */}
      <div className="max-w-5xl mx-auto bg-white p-4 rounded-lg shadow mb-4 no-print">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Eby-Gold Logo" className="w-16 h-16 object-contain" />
            <h1 className="text-2xl font-bold text-brand-600">Eby-Gold Superstores</h1>
          </div>
          <button onClick={() => setMode(mode==='invoice'?'receipt':'invoice')} className="flex items-center gap-2 px-3 py-2 bg-brand-500 text-white rounded text-sm">
            {mode==='invoice'?<Receipt size={16}/>:<FileText size={16}/>} {mode.toUpperCase()}
          </button>
        </div>
        
        <h3 className="font-semibold mb-2">Customer Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <input list="customers" placeholder="Customer Name" value={customer.name} onChange={e => setCustomer({...customer, name:e.target.value})} />
          <input placeholder="Phone 080..." value={customer.phone} onChange={e => setCustomer({...customer, phone:e.target.value})} />
          <input placeholder="Address" value={customer.address} onChange={e => setCustomer({...customer, address:e.target.value})} />
        </div>
        <datalist id="customers">{customers.map(c=><option key={c.name} value={c.name}/>)}</datalist>

        <h3 className="font-semibold mb-2">Items</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr className="bg-brand-500 text-white">
              <th>S/N</th><th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th></th>
            </tr></thead>
            <tbody>{items.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx+1}</td>
                <td><input list="products" value={item.name} onChange={e=>updateItem(item.id,'name',e.target.value)}/></td>
                <td><input type="number" value={item.qty} onChange={e=>updateItem(item.id,'qty',+e.target.value)}/></td>
                <td>₦{item.price.toLocaleString()}</td>
                <td>₦{(item.qty*item.price).toLocaleString()}</td>
                <td><Trash2 size={16} className="cursor-pointer text-red-500" onClick={()=>removeItem(item.id)}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <datalist id="products">{products.map(p=><option key={p.id} value={p.name}/>)}</datalist>
        <button onClick={addItem} className="mt-2 flex items-center gap-1 text-brand-600 font-semibold"><Plus size={16}/> Add Item</button>
        
        <div className="text-right mt-4 space-y-1">
          <p>Subtotal: ₦{subtotal.toLocaleString()}</p>
          <p>Discount: ₦<input type="number" value={discount} onChange={e=>setDiscount(+e.target.value)} className="w-24 ml-1"/></p>
          <p className="font-bold text-xl bg-brand-500 text-white p-3 rounded">Grand Total: ₦{total.toLocaleString()}</p>
          <p className="text-sm italic">{numberToWords(total)}</p>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={downloadPDF} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded"><Download/> Download PDF</button>
          <button onClick={sendWhatsApp} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"><Send/> Send WhatsApp</button>
          <button onClick={()=>window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"><Printer/> Print</button>
        </div>
      </div>

      {/* PRINTABLE INVOICE */}
      <div ref={invoiceRef} className="max-w-4xl mx-auto bg-white p-8 relative" style={{width: mode==='receipt'?'80mm':'210mm', minHeight: mode==='invoice'?'297mm':'auto'}}>
        {/* WATERMARK */}
        <img src={LOGO_URL} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 w-3/5 object-contain pointer-events-none"/>
        
        {/* HEADER */}
        <div className="flex flex-col items-center justify-center mb-4 relative z-10">
          <img src={LOGO_URL} alt="Eby-Gold Logo" className="w-20 h-20 object-contain mb-2" />
          <h1 className="text-3xl font-bold text-center text-brand-600">Eby-Gold Superstores</h1>
          <p className="text-center text-sm text-gray-600">Lagos, Nigeria</p>
        </div>
        <hr className="border-brand-500"/>

        <div className="my-4 relative z-10">
          <p><b>To:</b> {customer.name || '________'}</p>
          <p><b>Phone:</b> {customer.phone || '________'}</p>
          <p><b>Address:</b> {customer.address || '________'}</p>
        </div>

        <table className="mb-4 relative z-10">
          <thead><tr className="bg-gray-200">
            <th>S/N</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th>
          </tr></thead>
          <tbody>{items.filter(i=>i.name).map((item, idx) => (
            <tr key={item.id}>
              <td className="text-center">{idx+1}</td>
              <td>{item.name}</td>
              <td className="text-center">{item.qty}</td>
              <td className="text-right">₦{item.price.toLocaleString()}</td>
              <td className="text-right">₦{(item.qty*item.price).toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>

        <div className="text-right relative z-10">
          <p><b>Subtotal:</b> ₦{subtotal.toLocaleString()}</p>
          <p><b>Discount:</b> ₦{discount.toLocaleString()}</p>
          <p className="text-xl font-bold bg-brand-500 text-white p-2"><b>Grand Total:</b> ₦{total.toLocaleString()}</p>
          <p className="italic mt-1">Amount in Words: {numberToWords(total)}</p>
        </div>

        <div className="mt-6 text-sm relative z-10">
          <p><b>Bank Details:</b> {paymentInfo.bank} - {paymentInfo.accountName} - {paymentInfo.accountNo}</p>
        </div>

        <p className="text-center mt-8 font-semibold relative z-10">Thank you for shopping with Eby-Gold Superstores.</p>
        <p className="text-center text-xs relative z-10">Created by: {currentUser}</p>
      </div>
    </div>
  )
  }
