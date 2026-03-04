import { useState, useEffect } from "react";
import axios from "axios";
import { useRole } from "../context/RoleContext";
import { useNavigate } from "react-router-dom";
import { FaFilter, FaSortUp, FaSortDown } from "react-icons/fa";
import "../css/records.css";

// --- CONSTANTS ---
const SPONSORS = ["Pfizer", "GSK", "Merck", "Novartis", "Novo Nordisk", "Abbvie"];
const USERS = [
  "Rohan Mehta", "Sneha Kapoor", "Arjun Rao", "Priya Sharma", 
  "Karan Malhotra", "Neha Verma", "Vikram Singh", "Anuj Jaiswal", "Rajeshwari M"
];

const MOCK_RECORDS = [
  { record_id: "REC-1002", ticket_id: "TKT-20260302-000001", client_name: "GSK", project_description: "Oncology immunotherapy study", drug_name: "Lipitor", therapeutic_indication: "High cholesterol", status: "Approved", assigned_user: "Rohan Mehta", created_at: "2026-03-02T09:00:00" }, // Due Today (~50h)
  { record_id: "REC-1003", ticket_id: "TKT-20260301-000002", client_name: "Merck", project_description: "Type 2 diabetes trial", drug_name: "Humira", therapeutic_indication: "Rheumatoid arthritis", status: "Pending", assigned_user: "Sneha Kapoor", created_at: "2026-03-01T15:00:00" }, // Due Today (~68h)
  { record_id: "REC-1004", ticket_id: "TKT-20260223-000004", client_name: "Novartis", project_description: "Chronic heart failure study", drug_name: "Keytruda", therapeutic_indication: "Advanced melanoma", status: "Under-Review", assigned_user: "Arjun Rao", created_at: "2026-02-23T20:47:29" }, // Expired
  { record_id: "REC-1005", ticket_id: "TKT-20260222-000005", client_name: "Novo Nordisk", project_description: "Obesity program", drug_name: "Ozempic", therapeutic_indication: "Type 2 diabetes", status: "Rejected", assigned_user: "Priya Sharma", created_at: "2026-02-22T19:33:11" },
  { record_id: "REC-1006", ticket_id: "TKT-20260221-000006", client_name: "Abbvie", project_description: "Rheumatoid arthritis trial", drug_name: "Eliquis", therapeutic_indication: "Stroke prevention", status: "Approved", assigned_user: "Karan Malhotra", created_at: "2026-02-21T18:21:53" },
  { record_id: "REC-1007", ticket_id: "TKT-20260220-000007", client_name: "GSK", project_description: "Respiratory vaccine", drug_name: "Revlimid", therapeutic_indication: "Multiple myeloma", status: "Under-Review", assigned_user: "Neha Verma", created_at: "2026-02-20T17:14:36" },
  { record_id: "REC-1008", ticket_id: "TKT-20260304-000008", client_name: "Merck", project_description: "Solid tumor therapy", drug_name: "Entresto", therapeutic_indication: "Chronic heart failure", status: "Pending", assigned_user: "Vikram Singh", created_at: "2026-03-04T08:00:00" }, // On Track
];

const RecordsPage = () => {
  const { role } = useRole();
  const [records, setRecords] = useState(MOCK_RECORDS);
  const [filteredRecords, setFilteredRecords] = useState(MOCK_RECORDS);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: "", sponsor: "", user: "" });
  const [sortConfig, setSortConfig] = useState({ key: "record_id", direction: "asc" });
  const navigate = useNavigate();

  useEffect(() => { fetchTickets(); }, [role]);

  useEffect(() => {
    let result = [...records];
    if (filters.status) result = result.filter(r => r.status === filters.status);
    if (filters.sponsor) result = result.filter(r => r.client_name === filters.sponsor);
    if (filters.user) result = result.filter(r => r.assigned_user === filters.user);
    setFilteredRecords(result);
  }, [records, filters]);

  // --- SLA & TIME HELPERS ---
  const getDiffInHours = (createdAt) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    return (now - createdDate) / (1000 * 60 * 60);
  };

  const isSLAExpired = (createdAt) => getDiffInHours(createdAt) > 72;
  const isDueToday = (createdAt) => {
    const hours = getDiffInHours(createdAt);
    return hours >= 48 && hours <= 72;
  };

  const getTimeSince = (createdAt) => {
    const hours = Math.floor(getDiffInHours(createdAt));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h ago`;
  };

  const enrichRecord = (record) => {
    const randomIndex = Math.floor(Math.random() * MOCK_RECORDS.length);
    const randomUserIndex = Math.floor(Math.random() * USERS.length);
    return {
      ...record,
      drug_name: record.drug_name || MOCK_RECORDS[randomIndex].drug_name,
      therapeutic_indication: record.therapeutic_indication || MOCK_RECORDS[randomIndex].therapeutic_indication,
      assigned_user: record.assigned_user || USERS[randomUserIndex]
    };
  };

  const fetchTickets = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/records/tickets");
      let ticketData = res.data;
      if (role === "Safety Reviewer") {
        ticketData = ticketData.filter((t) => t.assigned_user === "Anuj Jaiswal");
      }
      setTickets(ticketData);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (tickets.length > 0) fetchRecords();
    else setRecords(MOCK_RECORDS);
  }, [tickets]);

  const fetchRecords = async () => {
    const allRecords = [];
    for (let ticket of tickets) {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/records/by_ticket/${ticket.ticket_id}`);
        if (Array.isArray(res.data)) {
          let enriched = res.data.map(enrichRecord);
          if (role === "Safety Reviewer") {
            enriched = enriched.filter((r) => r.assigned_user === "Anuj Jaiswal");
          }
          allRecords.push(...enriched);
        }
      } catch (err) { }
    }
    setRecords([...MOCK_RECORDS, ...allRecords]);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return fetchRecords();
    try {
      const res = await axios.get(`http://127.0.0.1:8000/records/search?search=${searchTerm}&limit=50`);
      const searched = (res.data.records || []).map(enrichRecord);
      setRecords([...MOCK_RECORDS, ...searched]);
    } catch (err) { console.error(err); }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
    const sorted = [...filteredRecords].sort((a, b) => {
      if (key === 'created_at') return direction === "asc" ? new Date(a[key]) - new Date(b[key]) : new Date(b[key]) - new Date(a[key]);
      return direction === "asc" ? (a[key] < b[key] ? -1 : 1) : (a[key] < b[key] ? 1 : -1);
    });
    setFilteredRecords(sorted);
  };

  const getStatusClass = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("pending")) return "status-badge pending";
    if (s.includes("review")) return "status-badge under-review";
    if (s.includes("approved")) return "status-badge approved";
    if (s.includes("rejected")) return "status-badge rejected";
    return "status-badge";
  };

  const headerStyle = { whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.1', padding: '6px 4px' };

  return (
    <div className="records-dashboard">
      <div className="records-header">
        <h2>Records Dashboard</h2>
      </div>

      <div className="dashboard-controls">
        <div className="search-container">
          <input type="text" className="search-input" placeholder="Search Record ID, Drug..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          <button className="search-btn" onClick={handleSearch}>Search</button>
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            <select name="status" value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="filter-select">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Under-Review">Under-Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select name="sponsor" value={filters.sponsor} onChange={(e) => setFilters({...filters, sponsor: e.target.value})} className="filter-select">
              <option value="">All Sponsors</option>
              {SPONSORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select name="user" value={filters.user} onChange={(e) => setFilters({...filters, user: e.target.value})} className="filter-select">
              <option value="">All Users</option>
              {USERS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            {(filters.status || filters.sponsor || filters.user) && (
                <button className="clear-filters-btn" onClick={() => setFilters({status:"", sponsor:"", user:""})}>Clear</button>
            )}
          </div>
        </div>
      </div>

      <div className="records-table-container">
        <table className="records-table" style={{ fontSize: '0.82rem', width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th onClick={() => handleSort("record_id")} style={headerStyle}>Record ID {sortConfig.key === "record_id" && (sortConfig.direction === "asc" ? <FaSortUp/> : <FaSortDown/>)}</th>
              <th onClick={() => handleSort("ticket_id")} style={headerStyle}>Ticket ID {sortConfig.key === "ticket_id" && (sortConfig.direction === "asc" ? <FaSortUp/> : <FaSortDown/>)}</th>
              <th style={headerStyle}>Sponsor</th>
              <th style={headerStyle}>Description</th>
              <th style={headerStyle}>Drug Name</th>
              <th style={headerStyle}>Indication</th>
              <th style={headerStyle}>SLA Status</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>User</th>
              <th onClick={() => handleSort("created_at")} style={headerStyle}>Creation Timeline {sortConfig.key === "created_at" && (sortConfig.direction === "asc" ? <FaSortUp/> : <FaSortDown/>)}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => {
              const expired = isSLAExpired(record.created_at);
              const dueToday = isDueToday(record.created_at);
              const rowStyle = dueToday ? { backgroundColor: '#fff9c4' } : {};

              return (
                <tr 
                  key={record.record_id} 
                  onClick={() => navigate(`/records/${record.record_id}`, { state: { ticket_id: record.ticket_id } })}
                  className={`clickable-row ${expired ? "sla-expired-row" : ""}`}
                  style={rowStyle}
                >
                  <td>{record.record_id}</td>
                  <td>{record.ticket_id}</td>
                  <td>{record.client_name}</td>
                  <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.project_description}</td>
                  <td>{record.drug_name}</td>
                  <td style={{ maxWidth: '120px' }}>{record.therapeutic_indication}</td>
                  <td style={{ fontWeight: 'bold' }}>
                    {expired ? <span style={{color: '#d9534f'}}>Expired</span> : 
                     dueToday ? <span style={{color: '#856404'}}>Due Today</span> : "On Track"}
                  </td>
                  <td><span className={getStatusClass(record.status)}>{record.status}</span></td>
                  <td>{record.assigned_user}</td>
                  <td style={{ lineHeight: '1.2' }}>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{new Date(record.created_at).toLocaleDateString()}</div>
                    <div style={{ fontWeight: '500' }}>{getTimeSince(record.created_at)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecordsPage;
