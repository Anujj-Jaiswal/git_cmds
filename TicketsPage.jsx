import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/ticketspage.css";
import { useRole } from "../context/RoleContext";
import { 
  FaDownload, FaTimes, FaSortUp, FaSortDown, 
  FaFilePdf, FaFileArchive, FaEnvelope, FaFolderOpen, FaCogs, FaFileCode, FaFilter 
} from "react-icons/fa"; 

// --- CONSTANTS ---
const SPONSORS = ["Pfizer", "GSK", "Merck", "Novartis", "Novo Nordisk", "Abbvie"];
const STUDIES = [
  "PROJ-GSK-IMMUNO2", "PROJ-MRK-DIAB3", "PROJ-NVS-CARD4", 
  "PROJ-NN-OBES5", "PROJ-ABBV-RA6", "PROJ-GSK-RESP7", 
  "PROJ-MRK-ONC8", "PROJ-PZR-TRIAL1"
];
const USERS = [
  "Rohan Mehta", "Sneha Kapoor", "Arjun Rao", "Priya Sharma", 
  "Karan Malhotra", "Neha Verma", "Vikram Singh", "Anuj Jaiswal", "Rajeshwari M"
];

// --- MOCK DATA (March 2026 Context) ---
const MOCK_DATA = [
  { ticket_id: "TKT-20260304-000008", source: "Email", tenant_name: "Fortrea", client_name: "Merck", project_key: "PROJ-MRK-ONC8", project_description: "Solid tumor therapy", drug_name: "Entresto", therapeutic_indication: "Chronic heart failure", status: "Closed", assigned_user: "Vikram Singh", created_at: "2026-03-04T08:00:00" }, // On Track
  { ticket_id: "TKT-20260302-000001", source: "Email", tenant_name: "Fortrea", client_name: "GSK", project_key: "PROJ-GSK-IMMUNO2", project_description: "Oncology immunotherapy study", drug_name: "Lipitor", therapeutic_indication: "High cholesterol", status: "Closed", assigned_user: "Rohan Mehta", created_at: "2026-03-02T09:00:00" }, // Due Today (~50h)
  { ticket_id: "TKT-20260301-000002", source: "Email", tenant_name: "Fortrea", client_name: "Merck", project_key: "PROJ-MRK-DIAB3", project_description: "Type 2 diabetes trial", drug_name: "Humira", therapeutic_indication: "Rheumatoid arthritis", status: "Closed", assigned_user: "Sneha Kapoor", created_at: "2026-03-01T15:00:00" }, // Due Today (~68h)
  { ticket_id: "TKT-20260223-000004", source: "Email", tenant_name: "Fortrea", client_name: "Novartis", project_key: "PROJ-NVS-CARD4", project_description: "Chronic heart failure study", drug_name: "Keytruda", therapeutic_indication: "Advanced melanoma", status: "Closed", assigned_user: "Arjun Rao", created_at: "2026-02-23T20:47:29" }, // Expired
  { ticket_id: "TKT-20260222-000005", source: "Email", tenant_name: "Fortrea", client_name: "Novo Nordisk", project_key: "PROJ-NN-OBES5", project_description: "Obesity program", drug_name: "Ozempic", therapeutic_indication: "Type 2 diabetes", status: "Closed", assigned_user: "Priya Sharma", created_at: "2026-02-22T19:33:11" },
  { ticket_id: "TKT-20260221-000006", source: "Email", tenant_name: "Fortrea", client_name: "Abbvie", project_key: "PROJ-ABBV-RA6", project_description: "Rheumatoid arthritis", drug_name: "Eliquis", therapeutic_indication: "Stroke prevention", status: "Closed", assigned_user: "Karan Malhotra", created_at: "2026-02-21T18:21:53" }
];

const TicketsPage = () => {
  const { role } = useRole();
  const [tickets, setTickets] = useState(MOCK_DATA);
  const [filteredTickets, setFilteredTickets] = useState(MOCK_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ sponsor: "", study: "", user: "" });
  
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [docCategory, setDocCategory] = useState(null); 
  const [documents, setDocuments] = useState([]);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });

  useEffect(() => {
    fetchTickets();
  }, []);

  // Sync filtering - prevents duplication by always deriving from 'tickets' state
  useEffect(() => {
    let result = [...tickets];
    if (filters.sponsor) result = result.filter(t => t.client_name === filters.sponsor);
    if (filters.study) result = result.filter(t => t.project_key === filters.study);
    if (filters.user) result = result.filter(t => t.assigned_user === filters.user);
    setFilteredTickets(result);
  }, [tickets, filters]);

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

  const enrichWithMockDrug = (ticket) => {
    const randomIndex = Math.floor(Math.random() * MOCK_DATA.length);
    const randomUserIndex = Math.floor(Math.random() * USERS.length);
    return {
      ...ticket,
      status: "Closed", // Force status to Closed
      drug_name: ticket.drug_name || MOCK_DATA[randomIndex].drug_name,
      therapeutic_indication: ticket.therapeutic_indication || MOCK_DATA[randomIndex].therapeutic_indication,
      assigned_user: ticket.assigned_user || USERS[randomUserIndex]
    };
  };

  const fetchTickets = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/records/tickets");
      const apiTickets = await Promise.all(
        res.data.map(async (t) => {
          try {
            const details = await axios.get(`http://127.0.0.1:8000/tickets/details/${t.ticket_id}`);
            return enrichWithMockDrug({ ...t, ...details.data });
          } catch { return enrichWithMockDrug(t); }
        })
      );
      // Combine and remove any accidental duplicates based on ticket_id
      const combined = [...MOCK_DATA, ...apiTickets];
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.ticket_id === v.ticket_id) === i);
      setTickets(unique.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      setTickets(MOCK_DATA);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return fetchTickets();
    try {
      const res = await axios.get(`http://127.0.0.1:8000/tickets/search?search=${searchTerm}&limit=50`);
      const searched = (res.data.tickets || []).map(enrichWithMockDrug);
      setTickets(searched); 
    } catch (err) { console.error(err); }
  };

  const sortBy = (key) => {
    let direction = "asc";
    if (sortConfig.key === key) direction = sortConfig.direction === "asc" ? "desc" : "asc";
    const sorted = [...filteredTickets].sort((a, b) => {
      if (key === 'created_at') return direction === "asc" ? new Date(a[key]) - new Date(b[key]) : new Date(b[key]) - new Date(a[key]);
      return direction === "asc" ? (a[key] < b[key] ? -1 : 1) : (a[key] < b[key] ? 1 : -1);
    });
    setFilteredTickets(sorted);
    setSortConfig({ key, direction });
  };

  const toggleExpand = (ticketId) => {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId);
    setDocCategory(null);
  };

  const fetchAndFilterDocs = async (ticketId, category) => {
    if (docCategory === category) { setDocCategory(null); setDocuments([]); return; }
    try {
      const docsRes = await axios.get(`http://127.0.0.1:8000/tickets/ticket/${ticketId}`);
      const filtered = docsRes.data.filter(d => 
        category === 'associated' ? ["Email Body", "Attachment", "Consolidated"].includes(d.file_type) : ["XML", "XML_PDF"].includes(d.file_type)
      );
      setDocuments(filtered);
      setDocCategory(category);
    } catch (err) { console.error(err); }
  };

  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase() || "";
    if (type.includes("pdf")) return <FaFilePdf />;
    if (type.includes("email")) return <FaEnvelope />;
    if (type.includes("xml")) return <FaFileCode />;
    return <FaFileArchive />; 
  }

  const handlePdfPreview = (path) => setPdfPreview(`http://127.0.0.1:8000/${path}`);

  const headerStyle = { whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.1', padding: '6px 4px' };

  return (
    <div className="tickets-wrapper">
      <h2 className="page-title">Tickets Dashboard</h2>

      <div className="dashboard-controls">
        <div className="search-container">
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
          <button onClick={handleSearch} className="search-btn">Search</button>
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            <select name="sponsor" value={filters.sponsor} onChange={(e) => setFilters({...filters, sponsor: e.target.value})} className="filter-select">
              <option value="">All Sponsors</option>
              {SPONSORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select name="study" value={filters.study} onChange={(e) => setFilters({...filters, study: e.target.value})} className="filter-select">
              <option value="">All Studies</option>
              {STUDIES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
            <select name="user" value={filters.user} onChange={(e) => setFilters({...filters, user: e.target.value})} className="filter-select">
              <option value="">All Users</option>
              {USERS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            {(filters.sponsor || filters.study || filters.user) && (
                <button className="clear-filters-btn" onClick={() => setFilters({sponsor:"", study:"", user:""})}>Clear</button>
            )}
          </div>
        </div>
      </div>

      <div className="tickets-table-container">
        <table className="tickets-table" style={{ fontSize: '0.82rem', width: '100%' }}>
          <thead>
            <tr>
              <th onClick={() => sortBy("ticket_id")} style={headerStyle}>Ticket ID {sortConfig.key === "ticket_id" && (sortConfig.direction === "asc" ? <FaSortUp/> : <FaSortDown/>)}</th>
              <th style={headerStyle}>Source</th>
              {role === "Admin" && <th style={headerStyle}>Sponsor</th>}
              <th style={headerStyle}>Study ID</th>
              <th style={headerStyle}>Description</th>
              <th style={headerStyle}>Drug Name</th>
              <th style={headerStyle}>Indication</th>
              <th style={headerStyle}>SLA Status</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>User</th>
              <th onClick={() => sortBy("created_at")} style={headerStyle}>Creation Timeline {sortConfig.key === "created_at" && (sortConfig.direction === "asc" ? <FaSortUp/> : <FaSortDown/>)}</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => {
              const expired = isSLAExpired(t.created_at);
              const dueToday = isDueToday(t.created_at);
              const rowStyle = dueToday ? { backgroundColor: '#fff9c4' } : {};

              return (
                <React.Fragment key={t.ticket_id}>
                  <tr 
                    onClick={() => toggleExpand(t.ticket_id)} 
                    className={`clickable-row ${expandedTicket === t.ticket_id ? "active-row" : ""} ${expired ? "sla-expired-row" : ""}`}
                    style={rowStyle}
                  >
                    <td>{t.ticket_id}</td>
                    <td>{t.source}</td>
                    {role === "Admin" && <td>{t.client_name || "-"}</td>}
                    <td>{t.project_key || "-"}</td>
                    <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.project_description}</td>
                    <td>{t.drug_name}</td>
                    <td style={{ maxWidth: '120px' }}>{t.therapeutic_indication}</td>
                    <td style={{ fontWeight: 'bold' }}>
                      {expired ? <span style={{color: '#d9534f'}}>Expired</span> : 
                       dueToday ? <span style={{color: '#856404'}}>Due Today</span> : "On Track"}
                    </td>
                    <td><span className="status-badge status-closed">Closed</span></td>
                    <td>{t.assigned_user}</td>
                    <td style={{ lineHeight: '1.2' }}>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{new Date(t.created_at).toLocaleDateString()}</div>
                      <div style={{ fontWeight: '500' }}>{getTimeSince(t.created_at)}</div>
                    </td>
                  </tr>

                  {expandedTicket === t.ticket_id && (
                    <tr className="expanded-row">
                      <td colSpan={role === "Admin" ? 11 : 10}>
                        <div className="compact-expansion-wrapper">
                          <div className="action-button-group">
                            <button className={`mini-action-btn ${docCategory === 'associated' ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); fetchAndFilterDocs(t.ticket_id, 'associated'); }}>
                              <FaFolderOpen /> Associated
                            </button>
                            <button className={`mini-action-btn ${docCategory === 'generated' ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); fetchAndFilterDocs(t.ticket_id, 'generated'); }}>
                              <FaCogs /> Generated
                            </button>
                          </div>
                          {docCategory && (
                            <div className="mini-document-section">
                              <div className="document-pills-container">
                                {documents.length > 0 ? documents.map((doc) => (
                                    <button key={doc.document_id} onClick={() => handlePdfPreview(doc.path)} className="document-pill mini-pill">
                                      {getFileIcon(doc.file_type)} <span className="document-name">{doc.filename}</span>
                                    </button>
                                )) : <p className="no-docs-text">No files available.</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pdfPreview && (
        <div className="pdf-modal">
          <div className="pdf-modal-content">
            <div className="pdf-modal-header">
              <button className="icon-btn" onClick={() => window.open(pdfPreview)}><FaDownload /> Download</button>
              <button className="close-btn" onClick={() => setPdfPreview(null)}><FaTimes /></button>
            </div>
            <iframe src={pdfPreview} title="PDF Preview" className="pdf-viewer" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
        
