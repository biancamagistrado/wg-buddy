import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { api } from "./api";
import { useAsync } from "./hooks";
import { ErrorBox, Spinner } from "./components/ui";
import Layout from "./components/Layout";
import CreateHousehold from "./pages/CreateHousehold";
import Overview from "./pages/Overview";
import Settings from "./pages/Settings";
import Shopping from "./pages/Shopping";
import Tasks from "./pages/Tasks";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HouseholdRedirect />} />
      <Route path="/new" element={<CreateHousehold />} />
      <Route path="/h/:householdId" element={<HouseholdLayout />}>
        <Route index element={<Overview />} />
        <Route path="shopping" element={<Shopping />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Sends you to your household, or to the setup screen if there isn't one yet. */
function HouseholdRedirect() {
  const { data, loading, error, reload } = useAsync(() => api.households.list());

  if (loading) return <Spinner label="Loading your household…" />;
  if (error)
    return (
      <div className="mx-auto max-w-md p-4">
        <ErrorBox message={error} onRetry={reload} />
      </div>
    );

  if (!data || data.length === 0) return <Navigate to="/new" replace />;
  return <Navigate to={`/h/${data[0].id}`} replace />;
}

/** Loads the household once and hands it to every child page via Layout. */
function HouseholdLayout() {
  const { householdId } = useParams<{ householdId: string }>();
  const { data, loading, error, reload } = useAsync(
    () => api.households.get(householdId!),
    [householdId],
  );

  if (loading) return <Spinner />;
  if (error)
    return (
      <div className="mx-auto max-w-md p-4">
        <ErrorBox message={error} onRetry={reload} />
      </div>
    );
  if (!data) return <Navigate to="/" replace />;

  return <Layout household={data} onHouseholdChange={reload} />;
}
