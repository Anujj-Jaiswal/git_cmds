import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/ticketspage.css";
import { useRole } from "../context/RoleContext";
import { 
  FaDownload, FaTimes, FaSort, FaSortUp, FaSortDown, 
  FaFilePdf, FaFileArchive, FaEnvelope, FaFolderOpen, FaCogs, FaFileCode, FaFilter 
} from "react-icons/fa"; 

// --- CONSTANTS FOR FILTERS ---
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

// --- MOCK DATA DEFINITION ---
const MOCK_DATA = [
  { ticket_id: "TKT-20260225-000002", source: "Email", tenant_name: "Fortrea", client_name: "GSK", project_key: "PROJ-GSK-IMMUNO2", project_description: "Oncology immunotherapy study", drug_name: "Lipitor (Atorvastatin)", therapeutic_indication: "High cholesterol management", status: "Closed", assigned_user: "Rohan Mehta", created_at: "2026-02-25T22:12:18" },
  { ticket_id: "TKT-20260224-000003", source: "Email", tenant_name: "Fortrea", client_name: "Merck", project_key: "PROJ-MRK-DIAB3", project_description: "Type 2 diabetes trial", drug_name: "Humira (Adalimumab)", therapeutic_indication: "Rheumatoid arthritis treatment", status: "Closed", assigned_user: "Sneha Kapoor", created_at: "2026-02-24T21:05:44" },
  { ticket_id: "TKT-20260223-000004", source: "Email", tenant_name: "Fortrea", client_name: "Novartis", project_key: "PROJ-NVS-CARD4", project_description: "Chronic heart failure study", drug_name: "Keytruda (Pembrolizumab)", therapeutic_indication: "Advanced melanoma therapy", status: "Closed", assigned_user: "Arjun Rao", created_at: "2026-02-23T20:47:29" },
  { ticket_id: "TKT-20260222-000005", source: "Email", tenant_name: "Fortrea", client_name: "Novo Nordisk", project_key: "PROJ-NN-OBES5", project_description: "Obesity management program", drug_name: "Ozempic (Semaglutide)", therapeutic_indication: "Type 2 diabetes control", status: "Closed", assigned_user: "Priya Sharma", created_at: "2026-02-22T19:33:11" },
  { ticket_id: "TKT-20260221-000006", source: "Email", tenant_name: "Fortrea", client_name: "Abbvie", project_key: "PROJ-ABBV-RA6", project_description: "Rheumatoid arthritis trial", drug_name: "Eliquis (Apixaban)", therapeutic_indication: "Stroke prevention in atrial fibrillation", status: "Closed", assigned_user: "Karan Malhotra", created_at: "2026-02-21T18:21:53" },
  { ticket_id: "TKT-20260220-000007", source: "Email", tenant_name: "Fortrea", client_name: "GSK", project_key: "PROJ-GSK-RESP7", project_description: "Respiratory vaccine development", drug_name: "Revlimid (Lenalidomide)", therapeutic_indication: "Multiple myeloma treatment", status: "Closed", assigned_user: "Neha Verma", created_at: "2026-02-20T17:14:36" },
  { ticket_id: "TKT-20260219-000008", source: "Email", tenant_name: "Fortrea", client_name: "Merck", project_key: "PROJ-MRK-ONC8", project_description: "Solid tumor therapy study", drug_name: "Entresto (Sacubitril/Valsartan)", therapeutic_indication: "Chronic heart failure management", status: "Closed", assigned_user: "Vikram Singh", created_at: "2026-02-19T16:02:27" },
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
  const [sortConfig, setSortConfig] = useState({ key: "ticket_id", direction: "asc" });

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    let result = [...tickets];

    if (filters.sponsor) {
      result = result.filter(t => t.client_name === filters.sponsor);
    }
    if (filters.study) {
      result = result.filter(t => t.project_key === filters.study);
    }
    if (filters.user) {
      result = result.filter(t => t.assigned_user === filters.user);
    }

    setFilteredTickets(result);
  }, [tickets, filters]);

  // --- SLA HELPER FUNCTION ---
  const isSLAExpired = (createdAt) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now - createdDate) / (1000 * 60 * 60);
    return diffInHours > 72;
  };

  const enrichWithMockDrug = (ticket) => {
    const randomIndex = Math.floor(Math.random() * MOCK_DATA.length);
    const randomUserIndex = Math.floor(Math.random() * USERS.length);
    return {
      ...ticket,
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
      setTickets([...MOCK_DATA, ...apiTickets]);
    } catch (err) {
      console.error("Error fetching tickets", err);
      setTickets(MOCK_DATA);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return fetchTickets();
    try {
      const res = await axios.get(`http://127.0.0.1:8000/tickets/search?search=${searchTerm}&limit=50`);
      const searched = (res.data.tickets || []).map(enrichWithMockDrug);
      setTickets(searched); 
    } catch (err) {
      console.error("Error searching tickets", err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const sortBy = (key) => {
    let direction = "asc";
    if (sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    }
    const sorted = [...filteredTickets].sort((a, b) => {
      if (key === 'created_at') {
        return direction === "asc" ? new Date(a[key]) - new Date(b[key]) : new Date(b[key]) - new Date(a[key]);
      }
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredTickets(sorted);
    setSortConfig({ key, direction });
  };

  const toggleExpand = (ticketId) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
      setDocCategory(null);
      setDocuments([]);
    } else {
      setExpandedTicket(ticketId);
      setDocCategory(null); 
    }
  };

  const fetchAndFilterDocs = async (ticketId, category) => {
    if (docCategory === category) {
      setDocCategory(null);
      setDocuments([]);
      return;
    }
    try {
      const docsRes = await axios.get(`http://127.0.0.1:8000/tickets/ticket/${ticketId}`);
      const allDocs = docsRes.data;
      let filtered = [];
      if (category === 'associated') {
        filtered = allDocs.filter(d => ["Email Body", "Attachment", "Consolidated"].includes(d.file_type));
      } else if (category === 'generated') {
        filtered = allDocs.filter(d => ["XML", "XML_PDF"].includes(d.file_type));
      }
      setDocuments(filtered);
      setDocCategory(category);
    } catch (err) { console.error("Error fetching documents", err); }
  };

  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase() || "";
    if (type.includes("pdf")) return <FaFilePdf />;
    if (type.includes("email")) return <FaEnvelope />;
    if (type.includes("xml")) return <FaFileCode />;
    return <FaFileArchive />; 
  }

  const getStatusClass = (status) => {
    const s = status?.toLowerCase() || "";
    if (s === "new") return "status-badge status-new";
    if (s === "under process") return "status-badge status-process";
    if (s === "closed") return "status-badge status-closed";
    return "status-badge";
  };

  const handlePdfPreview = (path) => {
    setPdfPreview(`http://127.0.0.1:8000/${path}`);
  };

  return (
    <div className="tickets-wrapper">
      <h2 className="page-title">Tickets Dashboard</h2>

      {/* SEARCH AND FILTER BAR */}
      <div className="dashboard-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search Ticket ID, Study, Sponsor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-btn">Search</button>
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            <select name="sponsor" value={filters.sponsor} onChange={handleFilterChange} className="filter-select">
              <option value="">All Sponsors</option>
              {SPONSORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select name="study" value={filters.study} onChange={handleFilterChange} className="filter-select">
              <option value="">All Studies</option>
              {STUDIES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            <select name="user" value={filters.user} onChange={handleFilterChange} className="filter-select">
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
        <table className="tickets-table">
          <thead>
            <tr>
              <th onClick={() => sortBy("ticket_id")} className="sortable">
                Ticket ID {sortConfig.key === "ticket_id" && (sortConfig.direction === "asc" ? <FaSortUp /> : <FaSortDown />)}
              </th>
              <th>Inbound Source</th>
              {role === "Admin" && <th>Tenant</th>}
              {role === "Admin" && <th>Sponsor</th>}
              <th>Study ID</th>
              <th>Description</th>
              <th>Drug Name</th>
              <th>Therapeutic Indication</th>
              <th>SLA Expired</th>
              <th>Status</th>
              <th>Assigned User</th>
              <th onClick={() => sortBy("created_at")} className="sortable">
                Created At {sortConfig.key === "created_at" && (sortConfig.direction === "asc" ? <FaSortUp /> : <FaSortDown />)}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => {
              const expired = isSLAExpired(t.created_at);
              return (
                <React.Fragment key={t.ticket_id}>
                  <tr 
                    onClick={() => toggleExpand(t.ticket_id)} 
                    className={`clickable-row ${expandedTicket === t.ticket_id ? "active-row" : ""} ${expired ? "sla-expired-row" : ""}`}
                  >
                    <td>{t.ticket_id}</td>
                    <td>{t.source}</td>
                    {role === "Admin" && <td>{t.tenant_name || "-"}</td>}
                    {role === "Admin" && <td>{t.client_name || "-"}</td>}
                    <td>{t.project_key || "-"}</td>
                    <td>{t.project_description}</td>
                    <td>{t.drug_name}</td>
                    <td>{t.therapeutic_indication}</td>
                    <td style={{ fontWeight: 'bold', color: expired ? '#d9534f' : 'inherit' }}>
                        {expired ? "Yes" : "No"}
                    </td>
                    <td><span className={getStatusClass(t.status)}>{t.status}</span></td>
                    <td>{t.assigned_user}</td>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                  </tr>

                  {expandedTicket === t.ticket_id && (
                    <tr className="expanded-row">
                      {/* colSpan adjusted to 12 for Admin, 10 for others due to new SLA column */}
                      <td colSpan={role === "Admin" ? 12 : 10}>
                        <div className="compact-expansion-wrapper">
                          <div className="action-button-group">
                            <button 
                              className={`mini-action-btn ${docCategory === 'associated' ? 'selected' : ''}`}
                              onClick={(e) => { e.stopPropagation(); fetchAndFilterDocs(t.ticket_id, 'associated'); }}
                            >
                              <FaFolderOpen /> Associated Documents
                            </button>
                            <button 
                              className={`mini-action-btn ${docCategory === 'generated' ? 'selected' : ''}`}
                              onClick={(e) => { e.stopPropagation(); fetchAndFilterDocs(t.ticket_id, 'generated'); }}
                            >
                              <FaCogs /> Generated Documents
                            </button>
                          </div>

                          {docCategory && (
                            <div className="mini-document-section">
                              <div className="document-pills-container">
                                {documents.length > 0 ? (
                                  documents.map((doc) => (
                                    <button
                                      key={doc.document_id}
                                      onClick={() => handlePdfPreview(doc.path)}
                                      className="document-pill mini-pill"
                                    >
                                      {getFileIcon(doc.file_type)}
                                      <span className="document-name">{doc.filename}</span>
                                    </button>
                                  ))
                                ) : (
                                  <p className="no-docs-text">No files available in this category.</p>
                                )}
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
              <button className="icon-btn"><FaDownload /> Download</button>
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
