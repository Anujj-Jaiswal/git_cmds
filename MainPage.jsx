import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import "../css/mainpage.css";
import { useRole } from "../context/RoleContext";

// --- MOCK DATA ---
const MOCK_TICKETS = [
  { ticket_id: "TKT-20260225-000002", source: "Email", tenant_name: "Fortrea", client_name: "GSK", project_key: "PROJ-GSK-IMMUNO2", project_description: "Oncology immunotherapy study", status: "Closed", assigned_user: "Rohan Mehta", created_at: "2026-02-25T22:12:18" },
  { ticket_id: "TKT-20260224-000003", source: "Email", tenant_name: "Fortrea", client_name: "Merck", project_key: "PROJ-MRK-DIAB3", project_description: "Type 2 diabetes trial", status: "Closed", assigned_user: "Sneha Kapoor", created_at: "2026-02-24T21:05:44" },
  { ticket_id: "TKT-20260223-000004", source: "Email", tenant_name: "Fortrea", client_name: "Novartis", project_key: "PROJ-NVS-CARD4", project_description: "Chronic heart failure study", status: "Closed", assigned_user: "Arjun Rao", created_at: "2026-02-23T20:47:29" },
  { ticket_id: "TKT-20260222-000005", source: "Email", tenant_name: "Fortrea", client_name: "Novo Nordisk", project_key: "PROJ-NN-OBES5", project_description: "Obesity management program", status: "Closed", assigned_user: "Priya Sharma", created_at: "2026-02-22T19:33:11" },
  { ticket_id: "TKT-20260221-000006", source: "Email", tenant_name: "Fortrea", client_name: "Abbvie", project_key: "PROJ-ABBV-RA6", project_description: "Rheumatoid arthritis trial", status: "Closed", assigned_user: "Karan Malhotra", created_at: "2026-02-21T18:21:53" },
  { ticket_id: "TKT-20260220-000007", source: "Email", tenant_name: "Fortrea", client_name: "GSK", project_key: "PROJ-GSK-RESP7", project_description: "Respiratory vaccine development", status: "Closed", assigned_user: "Neha Verma", created_at: "2026-02-20T17:14:36" },
  { ticket_id: "TKT-20260219-000008", source: "Email", tenant_name: "Fortrea", client_name: "Merck", project_key: "PROJ-MRK-ONC8", project_description: "Solid tumor therapy study", status: "Closed", assigned_user: "Vikram Singh", created_at: "2026-02-19T16:02:27" },
];

const MainPage = () => {
  const { role } = useRole();
  
  // Initialize stats with Mock values only
  const [stats, setStats] = useState({
    new_tickets_today: 0, 
    total_tickets: MOCK_TICKETS.length,
    pending_records: 2,
    under_review_records: 2,
    approved_records: 2,
    rejected_records: 1 // Added to track for the chart
  });

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState(MOCK_TICKETS);
  const [hoverClient, setHoverClient] = useState(null);
  const [hoverProject, setHoverProject] = useState(null);

  // Dynamic Chart Data based on current stats
  const chartData = [
    { name: "Approved", value: stats.approved_records, color: "#28a745" },
    { name: "Pending", value: stats.pending_records, color: "#ffc107" },
    { name: "Under-Review", value: stats.under_review_records, color: "#17a2b8" },
    { name: "Rejected", value: stats.rejected_records, color: "#dc3545" },
  ];

  useEffect(() => {
    // Derived from MOCK_TICKETS for Sidebar/Dropdowns
    const uniqueSponsors = [...new Set(MOCK_TICKETS.map(t => t.client_name))].map((name, index) => ({
      client_id: index,
      name: name,
      client_key: name.substring(0, 3).toUpperCase()
    }));

    const activeStudies = MOCK_TICKETS.map((t, index) => ({
      project_id: index,
      description: t.project_description,
      project_key: t.project_key
    }));

    setClients(uniqueSponsors);
    setProjects(activeStudies);

    const fetchData = async () => {
      try {
        const statsRes = await axios.get("http://127.0.0.1:8000/dashboard/stats");
        const apiStats = statsRes.data;

        // Update stats: Mock + API
        setStats({
          new_tickets_today: (apiStats.new_tickets_today || 0) + 1, // Mock has 1 new today logic
          total_tickets: MOCK_TICKETS.length + (apiStats.total_tickets || 0),
          pending_records: 2 + (apiStats.pending_records || 0),
          under_review_records: 2 + (apiStats.under_review_records || 0),
          approved_records: 2 + (apiStats.approved_records || 0),
          rejected_records: 1 + (apiStats.rejected_records || 0),
        });

        const ticketsRes = await axios.get("http://127.0.0.1:8000/dashboard/recent-tickets");
        if (ticketsRes.data.recent_tickets?.length > 0) {
            // Combine and Sort by Date (Descending) to get latest
            const combined = [...ticketsRes.data.recent_tickets, ...MOCK_TICKETS].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            setTickets(combined);
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      }
    };

    fetchData();
  }, [role]);

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case "new": return "status-new";
      case "under process":
      case "under-process": return "status-process";
      case "closed": return "status-closed";
      default: return "";
    }
  };

  const getFormattedDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    }).replace(/,/, '');
  };

  return (
    <div className="mainpage-wrapper">
      <div className="cards-container">
        <div className="dashboard-card card-light">
          <div className="card-title">New Tickets Today</div>
          <div className="card-count">{stats.new_tickets_today}</div>
        </div>
        <div className="dashboard-card card-light">
          <div className="card-title">Total Tickets</div>
          <div className="card-count">{stats.total_tickets}</div>
        </div>
        <div className="dashboard-card card-light">
          <div className="card-title">Pending Records</div>
          <div className="card-count">{stats.pending_records}</div>
        </div>
        <div className="dashboard-card card-light">
          <div className="card-title">Under Review</div>
          <div className="card-count">{stats.under_review_records}</div>
        </div>
        <div className="dashboard-card card-light">
          <div className="card-title">Approved Records</div>
          <div className="card-count">{stats.approved_records}</div>
        </div>
        
        {role === "Admin" && (
          <>
            <div
              className="dashboard-card hoverable card-light admin-client-card"
              onMouseEnter={() => setHoverClient(clients)}
              onMouseLeave={() => setHoverClient(null)}
            >
              <div className="card-title">Active Sponsors</div>
              <div className="card-count">{clients.length}</div>
              {hoverClient && (
                <div className="hover-details client-hover">
                  <div className="hover-header">Active Sponsors:</div>
                  {hoverClient.map((c) => (
                    <div key={c.client_id} className="hover-item">{c.name} ({c.client_key})</div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="dashboard-card hoverable card-light"
              onMouseEnter={() => setHoverProject(projects)}
              onMouseLeave={() => setHoverProject(null)}
            >
              <div className="card-title">Active Studies</div>
              <div className="card-count">{projects.length}</div>
              {hoverProject && (
                <div className="hover-details project-hover">
                  <div className="hover-header">Active Studies:</div>
                  {hoverProject.slice(0, 5).map((p) => (
                    <div key={p.project_id} className="hover-item">{p.description}</div>
                  ))}
                  {hoverProject.length > 5 && <div className="hover-more">...and {hoverProject.length - 5} more</div>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="dashboard-visuals">
        <div className="chart-section">
            <h3 className="section-title">Record Status Distribution</h3>
            <div className="pie-chart-wrapper" style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="recent-tickets-table-container">
          <h3 className="section-title">Recent Tickets</h3>
          <div className="search-bar-container">
            <input type="text" placeholder="Search by Ticket ID..." className="search-input" />
            <button className="search-button">Search</button>
          </div>

          <table className="tickets-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Study Description</th>
                <th>Status</th>
                <th>Inbound Source</th>
                <th>Assigned User</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {/* Only showing the top 5 latest tickets */}
              {tickets.slice(0, 5).map((t) => (
                <tr key={t.ticket_id}>
                  <td className="ticket-id">{t.ticket_id}</td>
                  <td>{t.project_description}</td>
                  <td><span className={`status-cell ${getStatusClass(t.status)}`}>{t.status}</span></td>
                  <td>{t.source}</td>
                  <td>{t.assigned_user}</td>
                  <td>{getFormattedDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
