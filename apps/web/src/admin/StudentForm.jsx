import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiRequest, formatApiError } from './api';

const emptyToNull = (schema) => z.preprocess(
  (value) => value === '' || value === undefined ? null : value,
  schema.nullable()
);

const textField = (max) => z.preprocess(
  (value) => typeof value === 'string' ? value.trim() || null : value,
  z.string().max(max).nullable()
);
const dateField = emptyToNull(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Enter a valid date.')
);
const booleanField = z.preprocess(
  (value) => value === '' || value === undefined ? null : value === 'true' ? true : value === 'false' ? false : value,
  z.boolean().nullable()
);
const countField = z.preprocess(
  (value) => value === '' || value === undefined ? null : Number(value),
  z.number().int().min(0).max(1000).nullable()
);

const studentSchema = z.object({
  applicationNumber: z.string().trim().min(1, 'Application number is required.').max(100).transform((value) => value.toUpperCase()),
  firstName: z.string().trim().min(1, 'First name is required.').max(200),
  parentId: emptyToNull(z.string().uuid('Enter a valid UUID.')),
  dateOfAdmission: dateField,
  admissionSoughtIn: textField(100),
  class: textField(100),
  section: textField(100),
  rollNumber: textField(100),
  surname: textField(200),
  nameUsedAtHome: textField(200),
  gender: textField(100),
  dateOfBirth: dateField,
  languageSpokenAtHome: textField(200),
  address: textField(10000),
  fatherName: textField(300),
  fatherEducationQualification: textField(300),
  fatherOccupation: textField(300),
  fatherMobileNumber: textField(32),
  motherName: textField(300),
  motherEducationQualification: textField(300),
  motherOccupation: textField(300),
  motherMobileNumber: textField(32),
  previousSchooling: booleanField,
  previousSchoolingDetails: textField(10000),
  toiletTrained: booleanField,
  brothersCount: countField,
  sistersCount: countField,
  status: z.enum(['Applied', 'Pending', 'Admitted', 'Rejected']),
});

const groups = [
  {
    title: 'Admission information',
    fields: [
      ['applicationNumber', 'Application number', 'text', true],
      ['dateOfAdmission', 'Date of admission', 'date'],
      ['admissionSoughtIn', 'Admission sought in'],
      ['class', 'Class'],
      ['section', 'Section'],
      ['rollNumber', 'Roll number'],
      ['status', 'Admission status', 'status'],
    ],
  },
  {
    title: 'Personal information',
    fields: [
      ['firstName', 'First name', 'text', true],
      ['surname', 'Surname'],
      ['nameUsedAtHome', 'Name used at home'],
      ['gender', 'Gender'],
      ['dateOfBirth', 'Date of birth', 'date'],
      ['languageSpokenAtHome', 'Language spoken at home'],
      ['address', 'Address', 'multiline'],
    ],
  },
  {
    title: 'Parents and guardians',
    fields: [
      ['fatherName', 'Father name'],
      ['fatherEducationQualification', 'Father education qualification'],
      ['fatherOccupation', 'Father occupation'],
      ['fatherMobileNumber', 'Father mobile number', 'tel'],
      ['motherName', 'Mother name'],
      ['motherEducationQualification', 'Mother education qualification'],
      ['motherOccupation', 'Mother occupation'],
      ['motherMobileNumber', 'Mother mobile number', 'tel'],
    ],
  },
  {
    title: 'Previous schooling and other details',
    fields: [
      ['previousSchooling', 'Previous schooling', 'boolean'],
      ['previousSchoolingDetails', 'Previous schooling details', 'multiline'],
      ['toiletTrained', 'Toilet trained', 'boolean'],
      ['brothersCount', 'Brothers', 'number'],
      ['sistersCount', 'Sisters', 'number'],
      ['parentId', 'Parent ID (legacy identifier)', 'text'],
    ],
  },
];

const initialValues = {
  applicationNumber: '',
  firstName: '',
  parentId: '',
  dateOfAdmission: '',
  admissionSoughtIn: '',
  class: '',
  section: '',
  rollNumber: '',
  surname: '',
  nameUsedAtHome: '',
  gender: '',
  dateOfBirth: '',
  languageSpokenAtHome: '',
  address: '',
  fatherName: '',
  fatherEducationQualification: '',
  fatherOccupation: '',
  fatherMobileNumber: '',
  motherName: '',
  motherEducationQualification: '',
  motherOccupation: '',
  motherMobileNumber: '',
  previousSchooling: '',
  previousSchoolingDetails: '',
  toiletTrained: '',
  brothersCount: '',
  sistersCount: '',
  status: 'Applied',
};

function toFormValues(revision) {
  const values = { ...initialValues };
  for (const key of Object.keys(values)) {
    const value = revision[key];
    if (value === null || value === undefined) continue;
    if (key === 'dateOfAdmission' || key === 'dateOfBirth') {
      values[key] = String(value).slice(0, 10);
    } else if (key === 'previousSchooling' || key === 'toiletTrained') {
      values[key] = value ? 'true' : 'false';
    } else {
      values[key] = String(value);
    }
  }
  return values;
}

function Field({ name, label, type = 'text', required = false, register, error }) {
  const common = {
    ...register(name),
    label: required ? `${label} *` : label,
    error: Boolean(error),
    helperText: error?.message,
    fullWidth: true,
    size: 'small',
    slotProps: {
      htmlInput: {
        maxLength: name === 'applicationNumber' ? 100 : undefined,
        ...(type === 'number' ? { min: 0, max: 1000, step: 1 } : {}),
      },
    },
  };

  if (type === 'status') {
    return (
      <TextField {...common} select defaultValue="Applied">
        {['Applied', 'Pending', 'Admitted', 'Rejected'].map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    );
  }

  if (type === 'boolean') {
    return (
      <TextField {...common} select defaultValue="">
        <MenuItem value="">Not specified</MenuItem>
        <MenuItem value="true">Yes</MenuItem>
        <MenuItem value="false">No</MenuItem>
      </TextField>
    );
  }

  return (
    <TextField
      {...common}
      type={type === 'multiline' ? 'text' : type}
      multiline={type === 'multiline'}
      minRows={type === 'multiline' ? 3 : undefined}
      autoComplete="off"
    />
  );
}

export default function StudentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [baseRevisionId, setBaseRevisionId] = useState(null);
  const [savedBaseline, setSavedBaseline] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoading(true);
    apiRequest(`/students/${id}`, { token: accessToken })
      .then((student) => {
        if (cancelled) return;
        const values = toFormValues(student.currentRevision);
        setBaseRevisionId(student.currentRevision.id);
        setSavedBaseline(studentSchema.parse(values));
        reset(values);
      })
      .catch((requestError) => {
        if (!cancelled) setError(formatApiError(requestError));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, id, isEdit, reset]);

  const fieldGroups = useMemo(() => groups, []);

  async function submit(values) {
    setSaving(true);
    setError('');
    try {
      let result;
      if (isEdit) {
        const changes = {};
        for (const key of Object.keys(initialValues)) {
          if (values[key] !== savedBaseline[key]) changes[key] = values[key];
        }
        if (Object.keys(changes).length === 0) {
          navigate(`/admin/students/${id}`);
          return;
        }
        result = await apiRequest(`/students/${id}`, {
          token: accessToken,
          method: 'PATCH',
          body: JSON.stringify({ basedOnRevisionId: baseRevisionId, changes }),
        });
        navigate(`/admin/students/${id}`, {
          state: result.staleBase ? { warning: 'This edit was based on an older revision. Review the latest profile and history.' } : undefined,
        });
      } else {
        result = await apiRequest('/students', {
          token: accessToken,
          method: 'POST',
          body: JSON.stringify(values),
        });
        navigate(`/admin/students/${result.id}`);
      }
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Box className="admin-loading"><CircularProgress /></Box>;
  if (isEdit && !savedBaseline) {
    return (
      <Box className="admin-page">
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'The student details could not be loaded.'}</Alert>
        <Button onClick={() => navigate('/admin/students')}>Back to students</Button>
      </Box>
    );
  }

  return (
    <Box className="admin-page">
      <Button className="back-link" onClick={() => navigate(isEdit ? `/admin/students/${id}` : '/admin/students')}>
        ← {isEdit ? 'Back to profile' : 'Back to students'}
      </Button>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">{isEdit ? 'Edit student details' : 'Add student'}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Required fields are marked. Other details can be added later.
        </Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit(submit)} noValidate>
        <Stack spacing={2}>
          {fieldGroups.map((group) => (
            <Paper className="student-form-section" key={group.title}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>{group.title}</Typography>
              <Box className="student-form-grid">
                {group.fields.map(([name, label, type, required]) => (
                  <Box className={type === 'multiline' ? 'student-form-field wide' : 'student-form-field'} key={name}>
                    <Field
                      name={name}
                      label={label}
                      type={type}
                      required={required}
                      register={register}
                      error={errors[name]}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          ))}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => navigate(isEdit ? `/admin/students/${id}` : '/admin/students')}>
              Cancel
            </Button>
            <Button variant="contained" type="submit" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save new revision' : 'Create student'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
