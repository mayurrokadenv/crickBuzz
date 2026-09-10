import { useEffect, useState } from "react";
import { approveAdmin, getAdminApprovalRequests ,type  AdminApprovalRequest } from "../../services/adminservice";
import "./AdminApproval.css";
import { showError, showSuccess } from "../../services/common/AlertService";
import Loader from "../Loader/Loader";

function AdminApproval() {

    const [approvalRequests, setApprovalRequests] = useState<AdminApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchApprovalRequests = async () => {
            try {
                const data = await getAdminApprovalRequests();
                setApprovalRequests(data);
            } catch (error) {
                console.error(error);
                setError("Failed to load approval requests");
            } finally {
                setLoading(false);
            }
        };

        fetchApprovalRequests();
    }, []);


const handleReject = (id: string) => {
    console.log(id);

    showError(
        "Coming Soon",
        "Reject feature is not implemented yet."
    );
};


    const handleApprove = async (id: string) => {
        try {
            await approveAdmin(id);

            setApprovalRequests((prev) =>
                prev.filter((admin) => admin.id !== id)
            );
            await showSuccess(
              "Success",
              "Admin approved successfully"
            );
        } catch (error) {
            console.error(error);
            showError(
              "Error",
              "Failed to approve admin"
            );
        }
    };

    if (loading) {
        return <Loader label="Loading approval requests..." fullWidth />;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <section className="admin-approval">
            <h2>Admin Approval Requests</h2>

            {approvalRequests.length === 0 ? (
                <p>No pending approval requests.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {approvalRequests.map((admin) => (
                            <tr key={admin.id}>
                                <td>
                                    {admin.firstName} {admin.lastName}
                                </td>

                                <td>{admin.email}</td>

                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="approve-btn"
                                            onClick={() => handleApprove(admin.id)}
                                        >
                                            Approve
                                        </button>

                                        <button className="reject-btn"  onClick={() => handleReject(admin.id)}>
                                            Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}

export default AdminApproval;