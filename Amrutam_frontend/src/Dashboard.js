import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './index.css';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Patient State
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [myConsultations, setMyConsultations] = useState([]);
  const [bookingMessage, setBookingMessage] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');

  // Doctor State
  const [mySlots, setMySlots] = useState([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [slotMessage, setSlotMessage] = useState('');
  const [activePrescriptionId, setActivePrescriptionId] = useState(null);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [prescriptionMessage, setPrescriptionMessage] = useState('');
  
  // Admin State
  const [systemOverview, setSystemOverview] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allConsultations, setAllConsultations] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('users/profile/');
      setProfile(res.data);
      if (res.data.is_admin) {
        fetchAdminData();
      } else if (res.data.is_doctor) {
        fetchDoctorData();
      } else {
        fetchPatientData();
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      const docRes = await api.get('consultations/doctors/');
      setDoctors(docRes.data);
      const consRes = await api.get('consultations/bookings/');
      setMyConsultations(consRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDoctorData = async () => {
    try {
      // For doctor, list_slots_view returns their own slots (booked and unbooked)
      const slotRes = await api.get('consultations/slots/');
      setMySlots(slotRes.data);
      const consRes = await api.get('consultations/bookings/');
      setMyConsultations(consRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const overviewRes = await api.get('audit/system-overview/');
      setSystemOverview(overviewRes.data);
      const usersRes = await api.get('audit/all-users/');
      setAllUsers(usersRes.data);
      const consRes = await api.get('audit/all-consultations/');
      setAllConsultations(consRes.data);
      const logsRes = await api.get('audit/system-logs/');
      setSystemLogs(logsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Patient Functions ---

  const handleSelectDoctor = async (doctor) => {
    setSelectedDoctor(doctor);
    setBookingMessage('');
    try {
      const response = await api.get(`consultations/slots/?doctor_id=${doctor.id}`);
      setSlots(response.data);
    } catch (err) {
      console.error('Failed to fetch slots', err);
    }
  };

  const handleBookSlot = async (slotId) => {
    try {
      await api.post('consultations/bookings/create/', {
        slot: slotId,
        doctor: selectedDoctor.id,
      });
      setBookingMessage('Successfully booked the slot!');
      handleSelectDoctor(selectedDoctor);
      const consRes = await api.get('consultations/bookings/');
      setMyConsultations(consRes.data);
    } catch (err) {
      setBookingMessage(err.response?.data?.detail || 'Failed to book the slot.');
    }
  };

  const handlePayNow = async (consultationId) => {
    setPaymentMessage('');
    try {
      const { data } = await api.post('payments/create-order/', { consultation_id: consultationId });
      
      const options = {
        key: 'rzp_test_TdoZLfW9TmPDwM',
        amount: data.amount,
        currency: data.currency,
        name: 'Amrutam Telemedicine',
        description: 'Consultation Fee',
        order_id: data.order_id,
        handler: async function (response) {
          try {
            await api.post('payments/verify/', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setPaymentMessage('Payment Successful!');
            fetchPatientData();
          } catch (verifyError) {
            setPaymentMessage('Payment Verification Failed!');
          }
        },
        theme: { color: '#2d6a4f' }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        setPaymentMessage('Payment Failed or Cancelled.');
      });
      rzp.open();
    } catch (err) {
      setPaymentMessage('Failed to initialize payment gateway.');
    }
  };

  // --- Doctor Functions ---
  
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSlotMessage('');
    if (!slotDate || !slotTime) return;

    // Create Start DateTime
    const startDateTime = new Date(`${slotDate}T${slotTime}`);
    
    // Validate that the slot is not in the past
    if (startDateTime < new Date()) {
      setSlotMessage('Cannot create a slot in the past.');
      return;
    }

    // Create End DateTime (+20 mins)
    const endDateTime = new Date(startDateTime.getTime() + 20 * 60000);

    try {
      await api.post('consultations/slots/create/', {
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString()
      });
      setSlotMessage('Slot added successfully!');
      fetchDoctorData(); // Refresh slots
    } catch (err) {
      setSlotMessage(err.response?.data?.detail || 'Failed to add slot.');
    }
  };

  const handleIssuePrescription = async (consultationId) => {
    setPrescriptionMessage('');
    if (!prescriptionText) return;
    try {
      await api.post('consultations/prescriptions/create/', {
        consultation: consultationId,
        medications: prescriptionText
      });
      setPrescriptionMessage('Prescription issued successfully!');
      setActivePrescriptionId(null);
      setPrescriptionText('');
      fetchDoctorData();
    } catch (err) {
      setPrescriptionMessage(err.response?.data?.detail || 'Failed to issue prescription.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;

  return (
    <div className="dashboard-layout">
      <div className="dashboard-header">
        <h1 style={{ color: 'var(--primary-dark)', margin: 0, fontSize: '24px' }}>
          {profile?.is_admin ? 'Admin Dashboard' : profile?.is_doctor ? `Doctor Dashboard (Dr. ${profile.email})` : 'Amrutam Dashboard'}
        </h1>
        <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {profile?.is_admin ? (
        // ADMIN DASHBOARD
        <div className="dashboard-content" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flexShrink: 0 }}>
            <div className="auth-card" style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#666' }}>Total Doctors</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{systemOverview?.total_doctors || 0}</p>
            </div>
            <div className="auth-card" style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#666' }}>Total Patients</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{systemOverview?.total_patients || 0}</p>
            </div>
            <div className="auth-card" style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#666' }}>Total Consultations</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{systemOverview?.total_consultations || 0}</p>
            </div>
            <div className="auth-card" style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#666' }}>Total Revenue</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--gold-accent)' }}>₹{systemOverview?.total_revenue || 0}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '30px', flex: 1, overflow: 'hidden' }}>
            <div className="panel-column" style={{ flex: 1, minWidth: '300px' }}>
              <h2 className="panel-header">All Users</h2>
              <div className="panel-body scrollable">
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--card-bg)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0f4f8', textAlign: 'left' }}>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border-color)' }}>Email</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border-color)' }}>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        <td style={{ padding: '12px 15px', fontSize: '14px', borderBottom: '1px solid #eee' }}>{u.email}</td>
                        <td style={{ padding: '12px 15px', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #eee', color: u.role === 'Admin' ? 'red' : u.role === 'Doctor' ? 'var(--primary-color)' : '#666' }}>{u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel-column" style={{ flex: 1, minWidth: '400px' }}>
              <h2 className="panel-header">All Consultations</h2>
              <div className="panel-body scrollable" style={{ paddingRight: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {allConsultations.length === 0 ? (
                    <p style={{ color: '#666' }}>No consultations found in the system.</p>
                  ) : (
                    allConsultations.map(c => (
                      <div key={c.id} className="auth-card" style={{ padding: '20px', borderLeft: `5px solid ${c.status === 'completed' ? 'var(--primary-color)' : c.status === 'paid' ? 'var(--gold-accent)' : 'orange'}`, marginBottom: '0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ margin: 0, fontSize: '15px' }}><strong>Patient:</strong> {c.patient_email}</p>
                          <span style={{ 
                            backgroundColor: c.status === 'completed' ? 'var(--light-green)' : c.status === 'paid' ? '#fffbeb' : '#fff5f5', 
                            color: c.status === 'completed' ? 'var(--primary-color)' : c.status === 'paid' ? '#b45309' : 'red',
                            padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
                          }}>
                            {c.status.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                        <p style={{ margin: '8px 0', fontSize: '15px' }}><strong>Doctor:</strong> Dr. {c.doctor_email}</p>
                        {c.slot_time && (
                          <p style={{ fontSize: '13px', color: '#666', margin: '5px 0' }}>
                            Slot: {new Date(c.slot_time).toLocaleString()}
                          </p>
                        )}
                        
                        {c.has_prescription && c.prescription_text && (
                          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: 'var(--bg-color)', borderLeft: '3px solid var(--primary-color)', borderRadius: '0 4px 4px 0' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: 'var(--primary-color)' }}>Prescription Issued:</p>
                            <div className="scrollable" style={{ maxHeight: '100px', overflowY: 'auto', marginTop: '8px' }}>
                              <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', color: '#444' }}>{c.prescription_text}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="panel-column" style={{ flex: 1, minWidth: '350px' }}>
              <h2 className="panel-header">System Activity Logs</h2>
              <div className="panel-body scrollable" style={{ paddingRight: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {systemLogs.length === 0 ? (
                    <p style={{ color: '#666', fontSize: '14px' }}>No system logs available.</p>
                  ) : (
                    systemLogs.map(log => (
                      <div key={log.id} style={{ 
                        padding: '12px 15px', 
                        backgroundColor: 'var(--card-bg)', 
                        borderLeft: '4px solid var(--primary-color)',
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--primary-dark)' }}>{log.action}</span>
                          <span style={{ fontSize: '11px', color: '#888' }}>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#444' }}>{log.details}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#888', fontStyle: 'italic' }}>By: {log.user}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : profile?.is_doctor ? (
        // DOCTOR DASHBOARD
        <div className="dashboard-content">
          <div className="panel-column" style={{ flex: '1', minWidth: '300px' }}>
            <h2 className="panel-header">Manage Slots</h2>
            <div className="panel-body scrollable">
              <div className="auth-card" style={{ marginBottom: '20px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px' }}>Add New Slot (20 mins)</h3>
                {slotMessage && <p style={{ color: slotMessage.includes('success') ? 'var(--primary-color)' : 'var(--error-color)', margin: '10px 0', fontSize: '13px' }}>{slotMessage}</p>}
                <form onSubmit={handleCreateSlot} style={{ marginTop: '15px' }}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Date</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} value={slotDate} onChange={e => setSlotDate(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Start Time</label>
                    <input type="time" value={slotTime} onChange={e => setSlotTime(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>Add Slot</button>
                </form>
              </div>

              <div className="auth-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px' }}>My Existing Slots</h3>
                <ul style={{ listStyleType: 'none', padding: 0, marginTop: '15px' }}>
                  {mySlots.length === 0 ? <p style={{ color: '#666', fontSize: '14px' }}>No slots created.</p> : mySlots.map(s => (
                    <li key={s.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(s.start_time).toLocaleString()}</span>
                      <span style={{ color: s.is_booked ? 'var(--error-color)' : 'var(--primary-color)', fontWeight: '600', fontSize: '12px' }}>
                        {s.is_booked ? 'BOOKED' : 'OPEN'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="panel-column" style={{ flex: '2', minWidth: '400px' }}>
            <h2 className="panel-header">Upcoming Consultations</h2>
            <div className="panel-body scrollable" style={{ paddingRight: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {myConsultations.length === 0 ? (
                  <p style={{ color: '#666' }}>No upcoming appointments.</p>
                ) : (
                  myConsultations.map(cons => (
                    <div key={cons.id} className="auth-card" style={{ padding: '20px', borderLeft: `5px solid ${cons.status === 'completed' ? 'var(--primary-color)' : cons.status === 'paid' ? 'var(--gold-accent)' : 'orange'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: 0, fontSize: '15px' }}><strong>Patient:</strong> {cons.patient_email || `User #${cons.patient}`}</p>
                        <span style={{ 
                          backgroundColor: cons.status === 'completed' ? 'var(--light-green)' : cons.status === 'paid' ? '#fffbeb' : '#fff5f5', 
                          color: cons.status === 'completed' ? 'var(--primary-color)' : cons.status === 'paid' ? '#b45309' : 'red',
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
                        }}>
                          {cons.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                      
                      {cons.slot_details && (
                        <p style={{ fontSize: '13px', color: '#666', margin: '8px 0' }}>
                          Slot: {new Date(cons.slot_details.start_time).toLocaleString()}
                        </p>
                      )}
                      
                      {cons.prescription ? (
                        <div style={{ marginTop: '15px', padding: '12px', backgroundColor: 'var(--bg-color)', borderLeft: '3px solid var(--primary-color)', borderRadius: '0 4px 4px 0' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: 'var(--primary-color)' }}>Prescription Issued:</p>
                          <div className="scrollable" style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '8px' }}>
                            <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', color: '#444' }}>{cons.prescription.medications}</p>
                          </div>
                        </div>
                      ) : cons.status === 'paid' ? (
                        <div style={{ marginTop: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                          {activePrescriptionId === cons.id ? (
                            <div>
                              <textarea 
                                className="scrollable"
                                style={{ width: '100%', padding: '12px', minHeight: '100px', borderRadius: '6px', border: '1px solid var(--primary-color)', boxSizing: 'border-box', outline: 'none' }}
                                placeholder="Type prescription instructions here..."
                                value={prescriptionText}
                                onChange={(e) => setPrescriptionText(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => handleIssuePrescription(cons.id)}>Save</button>
                                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#e2e8f0', color: '#333' }} onClick={() => { setActivePrescriptionId(null); setPrescriptionMessage(''); }}>Cancel</button>
                              </div>
                              {prescriptionMessage && activePrescriptionId === cons.id && <p style={{ color: prescriptionMessage.includes('success') ? 'var(--primary-color)' : 'var(--error-color)', fontSize: '12px', marginTop: '8px' }}>{prescriptionMessage}</p>}
                            </div>
                          ) : (
                            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => { setActivePrescriptionId(cons.id); setPrescriptionText(''); setPrescriptionMessage(''); }}>
                              Write Prescription
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // PATIENT DASHBOARD
        <div className="dashboard-content">
          {/* COLUMN 1: Specialists */}
          <div className="panel-column" style={{ flex: '1', minWidth: '250px' }}>
            <h2 className="panel-header">Our Specialists</h2>
            <div className="panel-body scrollable">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {doctors.map(doc => (
                  <div 
                    key={doc.id} 
                    className="auth-card" 
                    style={{ 
                      cursor: 'pointer', 
                      padding: '15px', 
                      transition: 'all 0.2s ease',
                      borderColor: selectedDoctor?.id === doc.id ? 'var(--primary-color)' : 'var(--border-color)', 
                      borderWidth: selectedDoctor?.id === doc.id ? '2px' : '1px',
                      boxShadow: selectedDoctor?.id === doc.id ? '0 4px 12px rgba(45, 106, 79, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onClick={() => handleSelectDoctor(doc)}
                  >
                    <h3 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '16px' }}>Dr. {doc.email}</h3>
                    <p style={{ color: 'var(--gold-accent)', fontWeight: '600', fontSize: '13px', margin: '4px 0' }}>{doc.specialization}</p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '6px 0 0 0' }}>{doc.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 2: Booking Slots */}
          <div className="panel-column" style={{ flex: '1', minWidth: '250px' }}>
            <h2 className="panel-header">Booking</h2>
            <div className="panel-body scrollable" style={{ paddingRight: '15px' }}>
              {selectedDoctor ? (
                <div className="auth-card" style={{ padding: '20px', borderTop: '4px solid var(--primary-color)' }}>
                  <h3 style={{ fontSize: '15px', marginBottom: '15px', color: 'var(--primary-dark)' }}>
                    Slots for Dr. {selectedDoctor.email}
                  </h3>
                  {bookingMessage && <p style={{ color: bookingMessage.includes('Success') ? 'var(--primary-color)' : 'var(--error-color)', fontSize: '13px', marginBottom: '10px' }}>{bookingMessage}</p>}
                  
                  {slots.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#666' }}>No available slots right now.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {slots.map(slot => (
                        <button 
                          key={slot.id} 
                          className="btn-primary" 
                          style={{ 
                            width: '100%', 
                            padding: '12px 15px', 
                            backgroundColor: 'var(--bg-color)', 
                            color: 'var(--primary-dark)', 
                            border: '1px solid var(--primary-color)',
                            borderRadius: '8px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-color)'; e.currentTarget.style.color = '#fff'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-color)'; e.currentTarget.style.color = 'var(--primary-dark)'; }}
                          onClick={() => handleBookSlot(slot.id)}
                        >
                          <span>{new Date(slot.start_time).toLocaleDateString()}</span>
                          <span>{new Date(slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="auth-card" style={{ padding: '30px 20px', textAlign: 'center', borderStyle: 'dashed' }}>
                  <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Select a specialist to view their available slots.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: My Appointments */}
          <div className="panel-column" style={{ flex: '1', minWidth: '300px' }}>
            <h2 className="panel-header">My Appointments</h2>
            <div className="panel-body scrollable">
              {paymentMessage && <p style={{ color: paymentMessage.includes('Success') ? 'var(--primary-color)' : 'var(--error-color)', fontSize: '13px', marginBottom: '15px' }}>{paymentMessage}</p>}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {myConsultations.length === 0 ? (
                  <p style={{ color: '#666' }}>You have no upcoming appointments.</p>
                ) : (
                  myConsultations.map(cons => (
                    <div key={cons.id} className="auth-card" style={{ padding: '20px', borderTop: `4px solid ${cons.status === 'completed' ? 'var(--primary-color)' : cons.status === 'paid' ? 'var(--gold-accent)' : 'orange'}` }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '16px' }}><strong>Dr. {cons.doctor_details?.email}</strong></p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                        <span style={{ fontSize: '13px', color: '#666' }}>
                          {cons.slot_details 
                            ? `${new Date(cons.slot_details.start_time).toLocaleDateString()} at ${new Date(cons.slot_details.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                            : new Date(cons.created_at).toLocaleDateString()}
                        </span>
                        <span style={{ 
                          backgroundColor: cons.status === 'completed' ? 'var(--light-green)' : cons.status === 'paid' ? '#fffbeb' : '#fff5f5', 
                          color: cons.status === 'completed' ? 'var(--primary-color)' : cons.status === 'paid' ? '#b45309' : 'red',
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
                        }}>
                          {cons.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                      
                      {cons.status === 'payment_pending' && (
                        <button 
                          className="btn-primary" 
                          style={{ marginTop: '10px', width: '100%', padding: '10px', fontSize: '13px' }}
                          onClick={() => handlePayNow(cons.id)}
                        >
                          Pay Now (₹500)
                        </button>
                      )}
                      
                      {cons.prescription && (
                        <div style={{ marginTop: '15px', padding: '12px', backgroundColor: 'var(--bg-color)', borderLeft: '3px solid var(--primary-color)', borderRadius: '0 4px 4px 0' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: 'var(--primary-color)' }}>Doctor's Prescription:</p>
                          <div className="scrollable" style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '8px' }}>
                            <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', color: '#444' }}>{cons.prescription.medications}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
