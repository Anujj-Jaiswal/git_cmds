import { useState, useEffect } from "react";
import axios from "axios";
import { useRole } from "../context/RoleContext";
import { useNavigate } from "react-router-dom";
import { FaFilter } from "react-icons/fa";
import "../css/records.css";

// --- CONSTANTS ---
const SPONSORS = ["Pfizer", "GSK", "Merck", "Novartis", "Novo Nordisk", "Abbvie"];
const USERS = [
  "Rohan Mehta", "Sneha Kapoor", "Arjun Rao", "Priya Sharma", 
  "Karan Malhotra", "Neha Verma", "Vikram Singh", "Anuj Jaiswal", "Rajeshwari M"
];

const MOCK_RECORDS = [
  { record_id: "REC-1002", ticket_id: "TKT-20260225-000002", client_name: "GSK", project_description: "Oncology immunotherapy study", drug_name: "Lipitor (Atorvastatin)", therapeutic_indication: "High cholesterol management", status: "Approved", assigned_user: "Rohan Mehta", created_at: "2026-02-25T22:12:18" },
  { record_id: "REC-1003", ticket_id: "TKT-20260224-000003", client_name: "Merck", project_description: "Type 2 diabetes trial", drug_name: "Humira (Adalimumab)", therapeutic_indication: "Rheumatoid arthritis treatment", status: "Pending", assigned_user: "Sneha Kapoor", created_at: "2026-02-24T21:05:44" },
  { record_id: "REC-1004", ticket_id: "TKT-20260223-000004", client_name: "Novartis", project_description: "Chronic heart failure study", drug_name: "Keytruda (Pembrolizumab)", therapeutic_indication: "Advanced melanoma therapy", status: "Under-Review", assigned_user: "Arjun Rao", created_at: "2026-02-23T20:47:29" },
  { record_id: "REC-1005", ticket_id: "TKT-20260222-000005", client_name: "Novo Nordisk", project_description: "Obesity management program", drug_name: "Ozempic (Semaglutide)", therapeutic_indication: "Type 2 diabetes control", status: "Rejected", assigned_user: "Priya Sharma", created_at: "2026-02-22T19:33:11" },
  { record_id: "REC-1006", ticket_id: "TKT-20260221-000006", client_name: "Abbvie", project_description: "Rheumatoid arthritis trial", drug_name: "Eliquis (Apixaban)", therapeutic_indication: "Stroke prevention in atrial fibrillation", status: "Approved", assigned_user: "Karan Malhotra", created_at: "2026-02-21T18:21:53" },
  { record_id: "REC-1007", ticket_id: "TKT-20260220-000007", client_name: "GSK", project_description: "Respiratory vaccine development", drug_name: "Revlimid (Lenalidomide)", therapeutic_indication: "Multiple myeloma treatment", status: "Under-Review", assigned_user: "Neha Verma", created_at: "2026-02-20T17:14:36" },
  { record_id: "REC-1008", ticket_id: "TKT-20260219-000008", client_name: "Merck", project_description: "Solid tumor therapy study", drug_name: "Entresto (Sacubitril/Valsartan)", therapeutic_indication: "Chronic heart failure management", status: "Pending", assigned_user: "Vikram Singh", created_at: "2026-02-19T16:02:27" },
];

const RecordsPage = () => {
  const { role } = useRole();
  const [records, setRecords] = useState(MOCK_RECORDS);
  const [filteredRecords, setFilteredRecords] = useState(MOCK_RECORDS);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filters State
  const [filters, setFilters] = useState({ status: "", sponsor: "", user: "" });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, [role]);

  // Logic to handle local filtering
  useEffect(() => {
    let result = [...records];

    if (filters.status) result = result.filter(r => r.status === filters.status);
    if (filters.sponsor) result = result.filter(r => r.client_name === filters.sponsor);
    if (filters.user) result = result.filter(r => r.assigned_user === filters.user);

    setFilteredRecords(result);
  }, [records, filters]);

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
    } catch (err) {
      console.error("Error fetching tickets", err);
    }
  };

  useEffect(() => {
    if (tickets.length > 0) {
        fetchRecords();
    } else {
        setRecords(MOCK_RECORDS); // Always keep Mock Data
    }
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
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status !== 404) {
          console.warn(`Error for ticket ${ticket.ticket_id}:`, err);
        }
      }
    }
    setRecords([...MOCK_RECORDS, ...allRecords]);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return fetchRecords();
    try {
      const res = await axios.get(`http://127.0.0.1:8000/records/search?search=${searchTerm}&limit=50`);
      const searched = (res.data.records || []).map(enrichRecord);
      setRecords([...MOCK_RECORDS, ...searched]);
    } catch (err) {
      console.error("Error searching records", err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });

    const sorted = [...filteredRecords].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
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

  return (
    <div className="records-dashboard">
      <div className="records-header">
        <h2>Records Dashboard</h2>
      </div>

      <div className="dashboard-controls">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search Record ID, Drug, or Sponsor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch}>Search</button>
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            
            <select name="status" value={filters.status} onChange={handleFilterChange} className="filter-select">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Under-Review">Under-Review</option>
              <option value="Rejected">Rejected</option>
              <option value="Approved">Approved</option>
            </select>

            <select name="sponsor" value={filters.sponsor} onChange={handleFilterChange} className="filter-select">
              <option value="">All Sponsors</option>
              {SPONSORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select name="user" value={filters.user} onChange={handleFilterChange} className="filter-select">
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
        <table className="records-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("record_id")}>Record ID {sortConfig.key === "record_id" && (sortConfig.direction === "asc" ? "▲" : "▼")}</th>
              <th onClick={() => handleSort("ticket_id")}>Ticket ID {sortConfig.key === "ticket_id" && (sortConfig.direction === "asc" ? "▲" : "▼")}</th>
              <th>Sponsor</th>
              <th>Description</th>
              <th>Drug Name</th>
              <th>Therapeutic Indication</th>
              <th>Status</th>
              <th>Assigned User</th>
              <th onClick={() => handleSort("created_at")}>Created At {sortConfig.key === "created_at" && (sortConfig.direction === "asc" ? "▲" : "▼")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.record_id} onClick={() => navigate(`/records/${record.record_id}`, { state: { ticket_id: record.ticket_id } })}>
                <td>{record.record_id}</td>
                <td>{record.ticket_id}</td>
                <td>{record.client_name}</td>
                <td>{record.project_description}</td>
                <td>{record.drug_name}</td>
                <td>{record.therapeutic_indication}</td>
                <td><span className={getStatusClass(record.status)}>{record.status}</span></td>
                <td>{record.assigned_user}</td>
                <td>{new Date(record.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecordsPage;