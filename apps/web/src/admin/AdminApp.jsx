import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  CssBaseline,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import { DataGrid } from '@mui/x-data-grid';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiPhotoRequest, apiRequest, formatApiError, uploadStudentPhoto } from './api';
import StudentForm from './StudentForm';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6849a8', dark: '#513787', light: '#8b70bd' },
    background: { default: '#f5f6fa', paper: '#ffffff' },
    text: { primary: '#292634', secondary: '#686575' },
    error: { main: '#b42318' },
    warning: { main: '#8a6410' },
    success: { main: '#287552' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Nunito, Arial, sans-serif',
    button: { fontWeight: 800, textTransform: 'none' },
    h4: { fontWeight: 800, letterSpacing: '-0.03em' },
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { border: '1px solid #e9e8ef', boxShadow: '0 2px 8px rgba(41, 38, 52, 0.035)' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

const drawerWidth = 250;

function LoginPage() {
  const { signIn, accessToken, restoreSession, sessionError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (accessToken) {
      navigate('/admin/students', { replace: true });
      return;
    }
    void restoreSession().then((authenticated) => {
      if (authenticated) navigate('/admin/students', { replace: true });
    });
  }, [accessToken, navigate, restoreSession]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signIn(email, password);
      navigate(location.state?.from?.pathname ?? '/admin/students', { replace: true });
    } catch (requestError) {
      setError(requestError.status === 401
        ? 'Email or password was not recognized.'
        : formatApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box className="admin-login-shell">
      <Paper className="admin-login-card" component="section">
        <Box className="admin-login-brand">
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <SchoolRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="h5">Balvatika</Typography>
            <Typography variant="body2" color="text.secondary">Student administration</Typography>
          </Box>
        </Box>
        <Typography variant="h4" sx={{ mt: 4, mb: 1 }}>Welcome back</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Sign in with your school administrator account.
        </Typography>
        {(error || sessionError) && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">{error || sessionError}</Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <Box>
              <label className="admin-field-label" htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                className="admin-text-input"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Box>
            <Box>
              <label className="admin-field-label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                className="admin-text-input"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Box>
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
            </Button>
          </Stack>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          Access is limited to authorized school administrators.
        </Typography>
      </Paper>
    </Box>
  );
}

function RequireAdmin({ children }) {
  const { accessToken, checkingSession, sessionChecked, restoreSession } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!sessionChecked) void restoreSession();
  }, [sessionChecked, restoreSession]);

  if (checkingSession || !sessionChecked) {
    return <Box className="admin-loading"><CircularProgress aria-label="Checking administrator session" /></Box>;
  }
  if (!accessToken) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return children;
}

function AdminLayout() {
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login', { replace: true });
  }

  const navItems = [
    { label: 'Students', to: '/admin/students', icon: <GroupRoundedIcon /> },
  ];

  const drawerContent = (
    <Box className="admin-drawer-content">
      <Box className="admin-side-brand">
        <Avatar sx={{ bgcolor: 'primary.main' }}><SchoolRoundedIcon /></Avatar>
        <Box>
          <Typography fontWeight={800}>Balvatika</Typography>
          <Typography variant="caption" color="text.secondary">Admin workspace</Typography>
        </Box>
      </Box>
      <Divider />
      <Typography className="admin-nav-caption">WORKSPACE</Typography>
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.label}
            component={Link}
            to={item.to}
            selected={location.pathname.startsWith(item.to)}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: 'auto' }}>
        <Divider />
        <Box className="admin-user-box">
          <Avatar>{admin?.email?.slice(0, 1).toUpperCase() ?? 'A'}</Avatar>
          <Box className="admin-user-email">
            <Typography variant="body2" fontWeight={800} noWrap>{admin?.email}</Typography>
            <Typography variant="caption" color="text.secondary">Administrator</Typography>
          </Box>
          <IconButton aria-label="Sign out" onClick={handleSignOut} size="small">
            <LogoutRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box className="admin-shell">
      <AppBar
        className="admin-app-bar"
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` } }}
      >
        <Toolbar>
          <IconButton
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' }, mr: 1 }}
          >
            <MenuRoundedIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>
            Student management
          </Typography>
          <Chip label="Admin" size="small" color="primary" variant="outlined" />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: drawerWidth, top: '64px', height: 'calc(100% - 64px)' },
        }}
      >
        {drawerContent}
      </Drawer>
      <Box component="main" className="admin-main">
        <Outlet />
      </Box>
    </Box>
  );
}

function StudentListPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 25, rowCount: 0 });
  const [status, setStatus] = useState('');
  const [lifecycle, setLifecycle] = useState('Active');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchDraft.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchDraft]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({
      page: String(pagination.page + 1),
      pageSize: String(pagination.pageSize),
      lifecycle,
    });
    if (search) query.set('q', search);
    if (status) query.set('status', status);

    apiRequest(`/students?${query}`, { token: accessToken })
      .then((result) => {
        if (cancelled) return;
        setRows(result.items);
        setPagination((current) => ({ ...current, rowCount: result.pagination.total }));
      })
      .catch((requestError) => {
        if (!cancelled) setError(formatApiError(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken, lifecycle, pagination.page, pagination.pageSize, search, status]);

  const columns = useMemo(() => [
    {
      field: 'currentApplicationNumber',
      headerName: 'Application no.',
      minWidth: 150,
      flex: 0.9,
      renderCell: (params) => <Typography fontWeight={800} variant="body2">{params.value}</Typography>,
    },
    {
      field: 'studentName',
      headerName: 'Student name',
      minWidth: 170,
      flex: 1.1,
      valueGetter: (_value, row) => [row.firstName, row.surname].filter(Boolean).join(' '),
    },
    {
      field: 'classSection',
      headerName: 'Class & section',
      minWidth: 140,
      flex: 0.8,
      valueGetter: (_value, row) => [row.class, row.section].filter(Boolean).join(' · ') || '—',
    },
    {
      field: 'dateOfAdmission',
      headerName: 'Admission date',
      minWidth: 135,
      valueFormatter: (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—',
    },
    {
      field: 'status',
      headerName: 'Admission status',
      minWidth: 140,
      renderCell: (params) => <AdmissionChip status={params.value} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 125,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button size="small" onClick={() => navigate(`/admin/students/${params.row.id}`)}>
          View profile
        </Button>
      ),
    },
  ], [navigate]);

  return (
    <Box className="admin-page">
      <Stack
        className="admin-page-heading"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h4">Students</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Manage applications and student records.</Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate('/admin/students/new')}>Add student</Button>
      </Stack>
      <Paper className="student-list-panel">
        <Stack className="student-filters" direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box className="filter-search">
            <label htmlFor="student-search" className="admin-field-label">Search students</label>
            <input
              id="student-search"
              className="admin-text-input"
              value={searchDraft}
              onChange={(event) => {
                setSearchDraft(event.target.value);
                setPagination((current) => ({ ...current, page: 0 }));
              }}
              placeholder="Name or application number"
            />
          </Box>
          <Box>
            <label htmlFor="admission-filter" className="admin-field-label">Admission status</label>
            <select
              id="admission-filter"
              className="admin-text-input"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPagination((current) => ({ ...current, page: 0 }));
              }}
            >
              <option value="">All statuses</option>
              {['Applied', 'Pending', 'Admitted', 'Rejected'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Box>
          <Box>
            <label htmlFor="lifecycle-filter" className="admin-field-label">Record lifecycle</label>
            <select
              id="lifecycle-filter"
              className="admin-text-input"
              value={lifecycle}
              onChange={(event) => {
                setLifecycle(event.target.value);
                setPagination((current) => ({ ...current, page: 0 }));
              }}
            >
              <option value="Active">Active records</option>
              <option value="Inactive">Inactive records</option>
              <option value="All">All records</option>
            </select>
          </Box>
        </Stack>
        {error && <Alert severity="error" sx={{ mx: 2, mb: 2 }}>{error}</Alert>}
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          onRowClick={(params) => navigate(`/admin/students/${params.row.id}`)}
          loading={loading}
          rowCount={pagination.rowCount}
          paginationMode="server"
          paginationModel={{ page: pagination.page, pageSize: pagination.pageSize }}
          onPaginationModelChange={(model) => setPagination((current) => ({ ...current, ...model }))}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          sx={{
            border: 0,
            cursor: 'pointer',
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#faf9fc', borderBottomColor: '#ebeaf0' },
            '& .MuiDataGrid-cell': { borderBottomColor: '#f0eff4' },
          }}
          localeText={{ noRowsLabel: 'No students found for these filters.' }}
        />
      </Paper>
    </Box>
  );
}

function AdmissionChip({ status }) {
  const colors = {
    Applied: 'default',
    Pending: 'warning',
    Admitted: 'success',
    Rejected: 'error',
  };
  return <Chip size="small" label={status ?? '—'} color={colors[status] ?? 'default'} variant="outlined" />;
}

const profileGroups = [
  {
    title: 'Admission information',
    fields: [
      ['applicationNumber', 'Application number'],
      ['dateOfAdmission', 'Date of admission'],
      ['admissionSoughtIn', 'Admission sought in'],
      ['class', 'Class'],
      ['section', 'Section'],
      ['rollNumber', 'Roll number'],
      ['status', 'Admission status'],
    ],
  },
  {
    title: 'Personal information',
    fields: [
      ['firstName', 'First name'],
      ['surname', 'Surname'],
      ['nameUsedAtHome', 'Name used at home'],
      ['gender', 'Gender'],
      ['dateOfBirth', 'Date of birth'],
      ['languageSpokenAtHome', 'Language spoken at home'],
      ['address', 'Address'],
    ],
  },
  {
    title: 'Parents and guardians',
    fields: [
      ['fatherName', 'Father name'],
      ['fatherEducationQualification', 'Father education qualification'],
      ['fatherOccupation', 'Father occupation'],
      ['fatherMobileNumber', 'Father mobile number'],
      ['motherName', 'Mother name'],
      ['motherEducationQualification', 'Mother education qualification'],
      ['motherOccupation', 'Mother occupation'],
      ['motherMobileNumber', 'Mother mobile number'],
    ],
  },
  {
    title: 'Previous schooling and other details',
    fields: [
      ['previousSchooling', 'Previous schooling'],
      ['previousSchoolingDetails', 'Previous schooling details'],
      ['toiletTrained', 'Toilet trained'],
      ['brothersCount', 'Brothers'],
      ['sistersCount', 'Sisters'],
      ['parentId', 'Parent ID'],
      ['photoLocator', 'Photo reference'],
    ],
  },
];

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
    return new Date(value).toLocaleDateString('en-IN');
  }
  return String(value);
}

function ProfileDetails({ revision }) {
  return (
    <Stack spacing={2}>
      {profileGroups.map((group) => (
        <Paper className="profile-section" key={group.title}>
          <Typography variant="h6" fontWeight={800}>{group.title}</Typography>
          <Box className="profile-fields">
            {group.fields.map(([key, label]) => (
              <Box key={key} className="profile-field">
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {displayValue(revision[key])}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ))}
      <Paper className="profile-section">
        <Typography variant="h6" fontWeight={800}>Revision metadata</Typography>
        <Box className="profile-fields">
          <Box className="profile-field"><Typography variant="caption" color="text.secondary">Revision</Typography><Typography>#{revision.revisionNumber}</Typography></Box>
          <Box className="profile-field"><Typography variant="caption" color="text.secondary">Created</Typography><Typography>{displayValue(revision.createdOn)}</Typography></Box>
          <Box className="profile-field"><Typography variant="caption" color="text.secondary">Created by admin</Typography><Typography>{revision.createdByAdminId}</Typography></Box>
          <Box className="profile-field"><Typography variant="caption" color="text.secondary">Based on</Typography><Typography>{revision.basedOnRevisionId ?? 'Initial record'}</Typography></Box>
        </Box>
      </Paper>
    </Stack>
  );
}

function useStudentPhoto(studentId, locator, accessToken) {
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const photoId = /^local:([0-9a-f-]{36})\.(?:jpg|png|webp)$/.exec(locator ?? '')?.[1];

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setImageUrl('');
    setError('');
    if (photoId) {
      apiPhotoRequest(`/students/${studentId}/photo/${photoId}`, { token: accessToken })
        .then((blob) => {
          if (!cancelled) {
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          }
        })
        .catch((requestError) => {
          if (!cancelled) setError(formatApiError(requestError));
        });
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, photoId, studentId]);

  return { imageUrl, error };
}

function StudentPhoto({ studentId, locator, accessToken, onPhotoChanged }) {
  const { imageUrl, error: photoError } = useStudentPhoto(studentId, locator, accessToken);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const result = await uploadStudentPhoto(studentId, file, { token: accessToken });
      setNotice('Photo uploaded. A new revision was created; the previous photo remains in history.');
      onPhotoChanged(result.currentRevision.photoLocator);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Paper className="profile-section">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        {imageUrl && (
          <img className="student-photo-preview" src={imageUrl} alt="Current student photograph" />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800}>Student photograph</Typography>
          <Typography variant="body2" color="text.secondary">
            JPEG, PNG, or WebP upload; stored privately as a sanitized WebP image, maximum 5 MiB.
          </Typography>
        </Box>
        <Button
          component="label"
          variant="outlined"
          startIcon={<PhotoCameraRoundedIcon />}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : imageUrl ? 'Replace photo' : 'Upload photo'}
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={upload}
          />
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {photoError && <Alert severity="error" sx={{ mt: 2 }}>{photoError}</Alert>}
      {notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}
    </Paper>
  );
}

function HistoricalStudentPhoto({ studentId, revision, accessToken }) {
  const { imageUrl, error } = useStudentPhoto(studentId, revision.photoLocator, accessToken);
  if (!revision.photoLocator) return null;
  return (
    <Box sx={{ mb: 2 }}>
      {imageUrl && (
        <img
          className="student-photo-preview"
          src={imageUrl}
          alt={`Student photograph from revision ${revision.revisionNumber}`}
        />
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}

function StudentProfilePage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiRequest(`/students/${id}`, { token: accessToken })
      .then((result) => { if (!cancelled) setStudent(result); })
      .catch((requestError) => { if (!cancelled) setError(formatApiError(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, id]);

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      setHistory(await apiRequest(`/students/${id}/revisions`, { token: accessToken }));
    } catch (requestError) {
      setHistoryError(formatApiError(requestError));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deactivate() {
    setDeactivating(true);
    setError('');
    try {
      await apiRequest(`/students/${id}/lifecycle`, {
        token: accessToken,
        method: 'PATCH',
        body: JSON.stringify({ lifecycleStatus: 'Inactive' }),
      });
      setStudent((current) => ({ ...current, lifecycleStatus: 'Inactive' }));
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setDeactivating(false);
    }
  }

  if (loading) return <Box className="admin-loading"><CircularProgress /></Box>;
  if (error && !student) return <Box className="admin-page"><Alert severity="error">{error}</Alert></Box>;
  if (!student) return null;

  const revision = student.currentRevision;
  const fullName = [revision.firstName, revision.surname].filter(Boolean).join(' ');

  return (
    <Box className="admin-page">
      <Button className="back-link" onClick={() => navigate('/admin/students')}>← Back to students</Button>
      <Stack
        className="profile-heading"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between' }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h4">{fullName}</Typography>
            <AdmissionChip status={revision.status} />
            {student.lifecycleStatus === 'Inactive' && <Chip size="small" color="default" label="Inactive record" />}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.6 }}>
            {revision.applicationNumber} · {revision.class || 'Class not set'}{revision.section ? ` · Section ${revision.section}` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={() => { setHistory([]); void loadHistory(); }}>
            View history
          </Button>
          <Button variant="outlined" onClick={() => navigate(`/admin/students/${id}/edit`)}>
            Edit details
          </Button>
          {student.lifecycleStatus === 'Active' && (
            <Button color="error" variant="outlined" disabled={deactivating} onClick={() => {
              if (window.confirm('Mark this student record inactive? Its admission status and revision history will remain unchanged.')) {
                void deactivate();
              }
            }}>
              Mark inactive
            </Button>
          )}
        </Stack>
      </Stack>
      {location.state?.warning && <Alert severity="warning" sx={{ my: 2 }}>{location.state.warning}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <StudentPhoto
        studentId={id}
        locator={revision.photoLocator}
        accessToken={accessToken}
        onPhotoChanged={(photoLocator) => {
          setStudent((current) => ({
            ...current,
            currentRevision: { ...current.currentRevision, photoLocator },
          }));
        }}
      />
      <ProfileDetails revision={revision} />

      {historyLoading && <Box className="admin-loading"><CircularProgress /></Box>}
      {historyError && <Alert severity="error" sx={{ mt: 2 }}>{historyError}</Alert>}
      {!historyLoading && history.length > 0 && (
        <Paper className="profile-section history-panel">
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Revision history</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Previous revisions are read-only. Opening one displays its saved snapshot.
          </Typography>
          <Stack divider={<Divider flexItem />} spacing={0}>
            {history.map((item) => (
              <Button
                key={item.id}
                className="revision-history-row"
                onClick={async () => {
                  try {
                    const detail = await apiRequest(`/students/${id}/revisions/${item.id}`, { token: accessToken });
                    setSelectedRevision(detail);
                  } catch (requestError) {
                    setHistoryError(formatApiError(requestError));
                  }
                }}
              >
                <span>Revision #{item.revisionNumber} · {item.applicationNumber}</span>
                <span>{[item.firstName, item.surname].filter(Boolean).join(' ')}</span>
                <span>{item.status}</span>
                <span>{displayValue(item.createdOn)}</span>
                <span>Read snapshot →</span>
              </Button>
            ))}
          </Stack>
        </Paper>
      )}

      <Dialog
        open={Boolean(selectedRevision)}
        onClose={() => setSelectedRevision(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="revision-dialog-title"
      >
        {selectedRevision && (
          <>
            <DialogTitle id="revision-dialog-title">
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h5">Revision #{selectedRevision.revisionNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">Read-only historical snapshot</Typography>
                </Box>
                <Button onClick={() => setSelectedRevision(null)}>Close</Button>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <HistoricalStudentPhoto
                studentId={id}
                revision={selectedRevision}
                accessToken={accessToken}
              />
              <ProfileDetails revision={selectedRevision} />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default function AdminApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={<RequireAdmin><AdminLayout /></RequireAdmin>}
        >
          <Route index element={<Navigate to="/admin/students" replace />} />
          <Route path="students" element={<StudentListPage />} />
          <Route path="students/new" element={<StudentForm />} />
          <Route path="students/:id/edit" element={<StudentForm />} />
          <Route path="students/:id" element={<StudentProfilePage />} />
          <Route path="*" element={<Navigate to="/admin/students" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
