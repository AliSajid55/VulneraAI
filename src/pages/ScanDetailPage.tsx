import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";

import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { ScanDetail } from "../types";
import ScanResultView from "../components/ScanResultView";
import { Alert, Button, PageHeader, Skeleton, useToast } from "../components/ui";

export default function ScanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setScan(null);
    api<ScanDetail>(`/api/scans/${id}`)
      .then(setScan)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load scan."));
  }, [id]);

  const deleteScan = async () => {
    if (!scan || !window.confirm(`Delete scan #${scan.id}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api(`/api/scans/${scan.id}`, { method: "DELETE" });
      toast(`Scan #${scan.id} deleted.`);
      navigate("/history", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete scan.");
      setDeleting(false);
    }
  };

  const back = (
    <Link to="/history" className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-200">
      <ArrowLeft size={15} /> Back to history
    </Link>
  );

  if (error) return (<>{back}<Alert>{error}</Alert></>);
  if (!scan) return (
    <>
      {back}
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-3 h-4 w-48" />
      <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
      <Skeleton className="mt-5 h-48 w-full rounded-2xl" />
    </>
  );

  return (
    <>
      {back}
      <PageHeader
        eyebrow={`Scan #${scan.id}`}
        title={scan.title}
        subtitle={formatDateTime(scan.created_at)}
        action={
          <Button variant="danger-outline" onClick={deleteScan} loading={deleting}>
            <Trash2 size={16} /> Delete
          </Button>
        }
      />
      <ScanResultView scan={scan} />
    </>
  );
}
