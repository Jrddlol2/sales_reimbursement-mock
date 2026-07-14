import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Plus, Trash2, Calendar as CalendarIcon, Grid, List, Sparkles } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { User, Mom } from '../types';
import { CalendarGrid } from '../components/CalendarGrid';

export const SubmitClaim: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([{ expense_date: '', vendor: '', category: '', amount: '', payment_method: '', business_purpose: '', receipt_url: '' }]);
  const [meetingDetails, setMeetingDetails] = useState({
    type_of_account: '',
    company_name_dropdown: '',
    name_of_company_free: '',
    purpose_of_meeting: '',
    category: '',
    location: '',
    contact_person: '',
    contact_person_designation: '',
    contact_person_email: '',
    description: ''
  });
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [isCalendarView, setIsCalendarView] = useState(false);
  const [superior, setSuperior] = useState<User | null>(null);
  const [approverSchedule, setApproverSchedule] = useState<Mom[]>([]);

  useEffect(() => {
    if (user?.reports_to) {
      apiFetch('/api/users').then((users: User[]) => {
        const sup = users.find(u => u.id === user.reports_to);
        if (sup) setSuperior(sup);
      }).catch(console.error);

      apiFetch('/api/approver/schedule').then((moms: Mom[]) => {
        setApproverSchedule(moms);
      }).catch(console.error);
    }
  }, [user]);

  const handleQuickFill = () => {
    const today = new Date();
    const expenseDate = today.toISOString().split('T')[0];
    const meetingDateObj = new Date(today);
    meetingDateObj.setDate(meetingDateObj.getDate() + 3);
    const meetingDateStr = meetingDateObj.toISOString().split('T')[0];

    setExpenses([
      {
        expense_date: expenseDate,
        vendor: 'The Peninsula Manila',
        category: 'Meals',
        amount: '3250.00',
        payment_method: 'Corporate Card',
        business_purpose: 'Client lunch to discuss Q3 renewal terms',
        receipt_url: 'https://fake-s3.com/receipt-peninsula-lunch.pdf',
      },
      {
        expense_date: expenseDate,
        vendor: 'Grab',
        category: 'Travel',
        amount: '450.00',
        payment_method: 'Personal Card',
        business_purpose: 'Transport to and from client site',
        receipt_url: 'https://fake-s3.com/receipt-grab-transport.pdf',
      },
    ]);

    setMeetingDetails({
      type_of_account: 'Existing Client',
      company_name_dropdown: 'Acme Corp',
      name_of_company_free: '',
      purpose_of_meeting: 'Quarterly business review and contract renewal discussion',
      category: 'Business Review',
      location: 'Client HQ, Makati City',
      contact_person: 'Maria Santos',
      contact_person_designation: 'Procurement Director',
      contact_person_email: 'maria.santos@acmecorp.com',
      description: 'Reviewed account performance for the quarter and discussed terms for the upcoming contract renewal.',
    });

    setMeetingDate(meetingDateStr);
    setMeetingTime('10:00');
  };

  const handleAddExpense = () => {
    setExpenses([...expenses, { expense_date: '', vendor: '', category: '', amount: '', payment_method: '', business_purpose: '', receipt_url: '' }]);
  };

  const handleRemoveExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const updateExpense = (index: number, field: string, value: string) => {
    const newExp = [...expenses];
    (newExp[index] as any)[field] = value;
    setExpenses(newExp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingDate || !meetingTime) {
      return alert('Please select a meeting date and time.');
    }
    
    setLoading(true);
    try {
      // Validate receipts
      if (expenses.some(e => !e.receipt_url)) {
        return alert('Please upload a receipt for all expense line items.');
      }
      
      await apiFetch('/api/claims', {
        method: 'POST',
        body: JSON.stringify({
          expenses,
          meeting_date: `${meetingDate} ${meetingTime}`,
          attendees: `${user?.name}, ${superior?.name}`,
          client_meeting_details: {
            ...meetingDetails,
            company_name: meetingDetails.company_name_dropdown === 'Other' ? meetingDetails.name_of_company_free : meetingDetails.company_name_dropdown,
          }
        }),
      });
      navigate('/');
    } catch (err) {
      alert('Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-gray-900 tracking-tight">Submit Claim</h2>
          <p className="mt-1 text-sm text-gray-500">Provide expense details and schedule a review meeting with your Approver in one step.</p>
        </div>
        <button type="button" onClick={handleQuickFill} className="flex items-center gap-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded hover:bg-purple-100 transition-colors shrink-0">
          <Sparkles className="w-4 h-4" /> Quick-fill Sample Data
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Expenses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">1. Expense Line Items</h3>
            <button type="button" onClick={handleAddExpense} className="flex items-center gap-1 text-sm font-medium text-[#0095D5] hover:text-[#007BAF]">
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          {expenses.map((exp, i) => (
            <div key={i} className="bg-white p-4 rounded border border-gray-200 relative shadow-sm">
              {expenses.length > 1 && (
                <button type="button" onClick={() => handleRemoveExpense(i)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                    value={exp.expense_date} onChange={e => updateExpense(i, 'expense_date', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
                  <input type="text" required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                    value={exp.vendor} onChange={e => updateExpense(i, 'vendor', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                    value={exp.category} onChange={e => updateExpense(i, 'category', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Meals">Meals</option>
                    <option value="Travel">Travel</option>
                    <option value="Accommodation">Accommodation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input type="number" step="0.01" required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                    value={exp.amount} onChange={e => updateExpense(i, 'amount', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                  <select required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                    value={exp.payment_method} onChange={e => updateExpense(i, 'payment_method', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Corporate Card">Corporate Card</option>
                    <option value="Personal Card">Personal Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Business Purpose</label>
                  <input type="text" required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                    value={exp.business_purpose} onChange={e => updateExpense(i, 'business_purpose', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Receipt</label>
                  <input type="file" required={!exp.receipt_url} className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-[#0095D5] hover:file:bg-gray-100 transition-colors"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        updateExpense(i, 'receipt_url', `https://fake-s3.com/${e.target.files[0].name}`);
                      }
                    }}
                  />
                  {exp.receipt_url && (
                    <div className="text-[10px] text-green-600 mt-1">✓ Receipt attached</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Step 2: Meeting / Client Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">2. Meeting / Client Details</h3>
          <div className="bg-white p-6 rounded border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type of Account</label>
              <select className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.type_of_account} onChange={e => setMeetingDetails({...meetingDetails, type_of_account: e.target.value})}>
                <option value="">Select Account Type</option>
                <option value="Existing Client">Existing Client</option>
                <option value="Prospective Client / Lead">Prospective Client / Lead</option>
                <option value="Partner / Distributor">Partner / Distributor</option>
                <option value="Internal / Other">Internal / Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.category} onChange={e => setMeetingDetails({...meetingDetails, category: e.target.value})}>
                <option value="">Select Category</option>
                <option value="Sales Call">Sales Call</option>
                <option value="Client Servicing">Client Servicing</option>
                <option value="Business Review">Business Review</option>
                <option value="Contract/Negotiation">Contract/Negotiation</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company Name (List)</label>
              <select className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.company_name_dropdown} onChange={e => setMeetingDetails({...meetingDetails, company_name_dropdown: e.target.value})}>
                <option value="">Select Company</option>
                <option value="Acme Corp">Acme Corp</option>
                <option value="Globex">Globex</option>
                <option value="Initech">Initech</option>
                <option value="Other">Specify Other...</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name of Company (Specify)</label>
              <input type="text" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                placeholder={meetingDetails.company_name_dropdown === 'Other' ? 'Required if Other' : ''}
                value={meetingDetails.name_of_company_free} onChange={e => setMeetingDetails({...meetingDetails, name_of_company_free: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Purpose of Meeting</label>
              <input type="text" required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.purpose_of_meeting} onChange={e => setMeetingDetails({...meetingDetails, purpose_of_meeting: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <input type="text" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.location} onChange={e => setMeetingDetails({...meetingDetails, location: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
              <input type="text" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.contact_person} onChange={e => setMeetingDetails({...meetingDetails, contact_person: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person Designation</label>
              <input type="text" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.contact_person_designation} onChange={e => setMeetingDetails({...meetingDetails, contact_person_designation: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person Email</label>
              <input type="email" className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.contact_person_email} onChange={e => setMeetingDetails({...meetingDetails, contact_person_email: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={2} className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                value={meetingDetails.description} onChange={e => setMeetingDetails({...meetingDetails, description: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Step 3: Schedule Meeting */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">3. Schedule Review Meeting</h3>
            <div className="flex bg-gray-100 p-1 rounded">
              <button type="button" onClick={() => setIsCalendarView(false)} className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded ${!isCalendarView ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <List className="w-3.5 h-3.5" /> Quick Entry
              </button>
              <button type="button" onClick={() => setIsCalendarView(true)} className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded ${isCalendarView ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <Grid className="w-3.5 h-3.5" /> Calendar View
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded border border-gray-200 shadow-sm">
            {!isCalendarView ? (
              <div className="flex flex-col md:flex-row md:space-x-8">
                 <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Date</label>
                      <input type="date" required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                        value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Time</label>
                      <input type="time" required className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5] focus:ring-[#0095D5]"
                        value={meetingTime} onChange={e => setMeetingTime(e.target.value)} />
                    </div>
                    {superior && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
                        <span className="font-semibold block mb-1">Approver: {superior.name}</span>
                        Your immediate superior will be invited to this review meeting.
                      </div>
                    )}
                 </div>
                 
                 {/* Approver's Existing Schedule */}
                 <div className="flex-1 mt-6 md:mt-0 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-8">
                   <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400"/> Approver's Scheduled Meetings</h4>
                   {approverSchedule.length > 0 ? (
                     <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                       {approverSchedule.map(m => {
                         const timeMatch = m.meeting_date.match(/\d{4}-\d{2}-\d{2}\s+(.*)/);
                         const timeLabel = timeMatch ? timeMatch[1] : '';
                         return (
                           <li key={m.id} className="text-xs flex justify-between items-center p-2 rounded bg-gray-50 border border-gray-100">
                             <span className="text-gray-900 font-medium">{m.meeting_date.split(' ')[0]} {timeLabel && <span className="text-[#0095D5] ml-1">{timeLabel}</span>}</span>
                             <span className="text-gray-500 truncate max-w-[120px]">Review</span>
                           </li>
                         );
                       })}
                     </ul>
                   ) : (
                     <p className="text-xs text-gray-500 italic">No existing review meetings scheduled.</p>
                   )}
                   <p className="text-[10px] text-gray-400 mt-2">Check these times to avoid double-booking your Approver.</p>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:space-x-8">
                <div className="flex-1">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Select a date from the calendar. Approver's existing meetings are shown on the grid to help you avoid double-booking.</p>
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Date</label>
                        <input type="date" required className="block w-36 rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                          value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Time</label>
                        <input type="time" required className="block w-32 rounded border-gray-300 border p-2 text-sm focus:border-[#0095D5]"
                          value={meetingTime} onChange={e => setMeetingTime(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <CalendarGrid 
                    moms={approverSchedule} 
                    selectedDate={meetingDate}
                    onDateSelect={(dateStr) => setMeetingDate(dateStr)} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Review & Submit */}
        <div className="flex justify-between items-center bg-[#F4F6F8] p-4 rounded border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Total Amount: <span className="font-semibold text-gray-900">${expenses.reduce((s, e) => s + (Number(e.amount)||0), 0).toFixed(2)}</span></div>
          <button type="submit" disabled={loading} className="bg-[#0095D5] text-white px-6 py-2 rounded text-sm font-medium hover:bg-[#007BAF] disabled:opacity-50 transition-colors shadow-sm">
            {loading ? 'Submitting...' : 'Submit & Schedule Meeting'}
          </button>
        </div>
      </form>
    </div>
  );
};

