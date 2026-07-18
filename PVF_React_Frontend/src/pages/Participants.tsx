import { useEffect, useMemo, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Link, useNavigate, useParams } from 'react-router';
import { createDefaultParticipantProfile, deleteCustomerByEmail, getCustomers, saveCustomers, type CustomerRecord, type EventRecord, type ParticipantProfile, type StationDecision, type StationStatus } from '../DataControl';
import { useAuth } from '../context/AuthContext';

const stationTemplates = [
  {
    id: 'check-in',
    title: 'Station 1 – Check-In',
    description: 'Verify registration, confirm consent, and assign the participant ID.'
  },
  {
    id: 'vision-screening',
    title: 'Station 2 – Vision Screening',
    description: 'Record vision screening results and route the participant to the next step.'
    // its either pass or fail, if pass do nothing, if they fail we print out the stations and scores so real life doctors can add HIPPA related info on paper only
    // if no on station 2, jump to station 5 and don't print anything, don't force a print they press a button
},
  {
    id: 'eye-exam',
    title: 'Station 3 – Comprehensive Eye Exam',
    description: 'Provide a full exam and note prescription or referral outcomes.'
    // checked in, either referall to another doctor or go to station 4
    // only thing doctor does here is check after they're done
    // enum option of 'REFFERAL' or 'FRAME'
  },
  {
    id: 'frame-selection',
    title: 'Station 4 – Frame Selection',
    description: 'Record prescription details and frame selections for ordering.'
  },
  {
    id: 'vision-success',
    title: 'Station 5 – Vision Success',
    description: 'Confirm next steps, referrals, and follow-up resources before departure.'
    // if no on station 2, jump to station 5
}
];

function buildStationStatuses(): StationStatus[] {
  return stationTemplates.map((station, index) => ({
    id: station.id,
    title: station.title,
    description: station.description,
    status: index === 0 ? 'current' : 'pending'
  }));
}

function buildNewEvent(participantEmail: string, eventName: string): EventRecord {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `${participantEmail}-${Date.now()}`,
    participantEmail,
    eventName: eventName.trim() || 'Community Vision Event',
    eventDate: today,
    createdAt: new Date().toISOString(),
    status: 'active',
    stationStatuses: buildStationStatuses()
  };
}

const yesNoUnsure = ['Yes', 'No', 'Unsure'];
const visionConcernOptions = [
  'Difficulty seeing the board',
  'Blurry vision',
  'Frequent headaches',
  'Squinting',
  'Holds books or devices very close',
  'Eye strain',
  'Double vision',
  'No current concerns'
];
const resourceOptions = [
  'Food Assistance',
  'Housing Resources',
  'Employment Services',
  'Financial Literacy',
  'Health & Wellness Programs',
  'Youth Programs',
  'Veteran Resources',
  'Senior Resources',
  'Vision Care Resources'
];
const referralSources = [
  'Social Media',
  'School',
  'Community Partner',
  'Church/Faith Organization',
  'Healthcare Provider',
  'Friend/Family',
  'Motorsure America',
  'Prevent Blindness Ohio',
  'Other'
];

function sortEventsByRecency(left: EventRecord, right: EventRecord): number {
  const leftTime = Date.parse(left.createdAt || left.eventDate || '1970-01-01');
  const rightTime = Date.parse(right.createdAt || right.eventDate || '1970-01-01');

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
    return 0;
  }

  if (Number.isNaN(leftTime)) {
    return 1;
  }

  if (Number.isNaN(rightTime)) {
    return -1;
  }

  return rightTime - leftTime;
}

export default function Participants() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CustomerRecord>({});
  const [participantProfile, setParticipantProfile] = useState<ParticipantProfile>(createDefaultParticipantProfile());
  const [expanded, setExpanded] = useState<string>('section-1');
  const [searchTerm, setSearchTerm] = useState('');
  const [eventNameDraft, setEventNameDraft] = useState('Back to School Vision - 2026');
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [addEventScope, setAddEventScope] = useState<'single' | 'all'>('single');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const navigate = useNavigate();
  const params = useParams();
  const { user, role } = useAuth();

  useEffect(() => {
    async function loadData() {
      const data = await getCustomers();
      setCustomers(data);
      await saveCustomers(data);
      const emailParam = params.email?.toLowerCase();
      if (emailParam) {
        const match = data.find(customer => customer.Email?.toLowerCase() === emailParam);
        if (match) {
          setSelectedEmail(match.Email ?? '');
          setFormData(match);
        }
      } else if (data[0]) {
        setSelectedEmail(data[0].Email ?? '');
        setFormData(data[0]);
      }
      setLoading(false);
    }

    loadData();
  }, [params.email]);

  const selectedCustomer = useMemo(() => {
    return customers.find(customer => customer.Email?.toLowerCase() === selectedEmail.toLowerCase()) ?? customers[0];
  }, [customers, selectedEmail]);

  const participantEvents = useMemo(() => selectedCustomer?.Events ?? [], [selectedCustomer]);
  const sortedParticipantEvents = useMemo(() => [...participantEvents].sort(sortEventsByRecency), [participantEvents]);
  const participant = useMemo(() => selectedCustomer?.participant ?? createDefaultParticipantProfile(), [selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return customers;
    }

    return customers.filter(customer => {
      const fullName = `${customer['First Name'] ?? ''} ${customer['Last Name'] ?? ''}`.trim().toLowerCase();
      const email = (customer.Email ?? '').toLowerCase();

      return fullName.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [customers, searchTerm]);

  useEffect(() => {
    if (selectedCustomer) {
      setFormData(selectedCustomer);
      setParticipantProfile(selectedCustomer.participant ?? createDefaultParticipantProfile());
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (participantEvents.length === 0) {
      setExpandedEventId(null);
      return;
    }

    const latestEvent = sortedParticipantEvents[0];

    setExpandedEventId(current => {
      if (current && participantEvents.some(event => event.id === current)) {
        return current;
      }

      return latestEvent?.id ?? null;
    });
  }, [participantEvents, sortedParticipantEvents]);

  const handleSelect = (customer: CustomerRecord) => {
    const email = customer.Email ?? '';
    setSelectedEmail(email);
    setEditing(false);
    navigate(`/participants/${encodeURIComponent(email)}`);
  };

  const handleSave = async () => {
    const nextCustomers = customers.map(customer => {
      if (customer.Email?.toLowerCase() === formData.Email?.toLowerCase()) {
        return {
          ...customer,
          ...formData,
          participant: {
            ...participantProfile,
            updatedAt: new Date().toISOString()
          },
          Events: customer.Events ?? []
        };
      }
      return customer;
    });

    setCustomers(nextCustomers);
    try {
      await saveCustomers(nextCustomers);
    } catch (error) {
      console.error('Failed saving participant after edit', error);
    }
    setEditing(false);
  };

  const handleDeleteParticipant = async () => {
    if (!selectedCustomer?.Email) {
      return;
    }

    const confirmed = window.confirm(`Delete participant ${selectedCustomer.Email}? This removes their record and all saved events.`)
    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomerByEmail(selectedCustomer.Email)
      const remainingCustomers = customers.filter(customer => customer.Email?.toLowerCase() !== selectedCustomer.Email?.toLowerCase())
      setCustomers(remainingCustomers)
      setSelectedEmail(remainingCustomers[0]?.Email ?? '')
      setFormData(remainingCustomers[0] ?? {})
      setParticipantProfile(remainingCustomers[0]?.participant ?? createDefaultParticipantProfile())
      setEditing(false)
      navigate('/participants')
    } catch (error) {
      console.error('Failed deleting participant', error)
    }
  };

  const normalizeProfilePath = (path: string) => {
    return path.startsWith('participant.') ? path.slice('participant.'.length) : path;
  };

  const handleProfileChange = (path: string, value: string | boolean | string[] | number) => {
    setParticipantProfile(current => {
      const next = JSON.parse(JSON.stringify(current)) as ParticipantProfile;
      const segments = normalizeProfilePath(path).split('.');
      let target: Record<string, unknown> = next as unknown as Record<string, unknown>;

      segments.slice(0, -1).forEach(segment => {
        const currentTarget = target[segment] as Record<string, unknown> | undefined;
        if (!currentTarget || typeof currentTarget !== 'object') {
          target[segment] = {};
        }
        target = target[segment] as Record<string, unknown>;
      });

      const lastSegment = segments[segments.length - 1];
      target[lastSegment] = value;
      return next;
    });
  };

  const handleProfileArrayToggle = (path: string, value: string) => {
    setParticipantProfile(current => {
      const next = JSON.parse(JSON.stringify(current)) as ParticipantProfile;
      const segments = normalizeProfilePath(path).split('.');
      let target: Record<string, unknown> = next as unknown as Record<string, unknown>;

      segments.slice(0, -1).forEach(segment => {
        const currentTarget = target[segment] as Record<string, unknown> | undefined;
        if (!currentTarget || typeof currentTarget !== 'object') {
          target[segment] = {};
        }
        target = target[segment] as Record<string, unknown>;
      });

      const lastSegment = segments[segments.length - 1];
      const currentValues = Array.isArray(target[lastSegment]) ? (target[lastSegment] as string[]) : [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];

      target[lastSegment] = nextValues;
      return next;
    });
  };

  const handleAddEvent = async () => {
    if (!selectedCustomer?.Email) {
      return;
    }

    const newEvent = buildNewEvent(selectedCustomer.Email, eventNameDraft);
    setExpandedEventId(newEvent.id);
    const nextCustomers = customers.map(customer => {
      if (customer.Email?.toLowerCase() !== selectedCustomer.Email?.toLowerCase()) {
        return customer;
      }

      return {
        ...customer,
        Events: [...(customer.Events ?? []), newEvent]
      };
    });

    setCustomers(nextCustomers);
    try {
      await saveCustomers(nextCustomers);
    } catch (error) {
      console.error('Failed saving participant after adding event', error);
    }
  };

  const openAddEventModal = (scope: 'single' | 'all') => {
    setAddEventScope(scope);
    setIsAddEventModalOpen(true);
  };

  const confirmAddEvent = () => {
    if (addEventScope === 'all') {
      handleAddEventToAll();
    } else {
      handleAddEvent();
    }

    setIsAddEventModalOpen(false);
  };

  const handleAddEventToAll = async () => {
    const selectedCustomerEvent = buildNewEvent(selectedCustomer?.Email ?? '', eventNameDraft);
    setExpandedEventId(selectedCustomerEvent.id);
    const nextCustomers = customers.map(customer => {
      if (!customer.Email) {
        return customer;
      }

      const newEvent = customer.Email.toLowerCase() === selectedCustomer?.Email?.toLowerCase()
        ? selectedCustomerEvent
        : buildNewEvent(customer.Email, eventNameDraft);

      return {
        ...customer,
        Events: [...(customer.Events ?? []), newEvent]
      };
    });

    setCustomers(nextCustomers);
    try {
      await saveCustomers(nextCustomers);
    } catch (error) {
      console.error('Failed saving participants when adding event to all', error);
    }
  };

  const updateEvent = async (eventId: string, eventUpdates: Partial<EventRecord>) => {
    let nextCustomers: CustomerRecord[] = [];

    setCustomers(currentCustomers => {
      nextCustomers = currentCustomers.map(customer => {
        if (customer.Email?.toLowerCase() !== selectedEmail.toLowerCase()) {
          return customer;
        }

        return {
          ...customer,
          Events: (customer.Events ?? []).map(event => event.id === eventId ? { ...event, ...eventUpdates } : event)
        };
      });

      return nextCustomers;
    });

    try {
      await saveCustomers(nextCustomers);
    } catch (error) {
      console.error('Failed saving participant after event update', error);
    }
  };

  const updateEventStation = async (eventId: string, stationId: string, stationUpdates: Partial<StationStatus>) => {
    let nextCustomers: CustomerRecord[] = [];

    setCustomers(currentCustomers => {
      nextCustomers = currentCustomers.map(customer => {
        if (customer.Email?.toLowerCase() !== selectedEmail.toLowerCase()) {
          return customer;
        }

        return {
          ...customer,
          Events: (customer.Events ?? []).map(event => {
            if (event.id !== eventId) {
              return event;
            }

            return {
              ...event,
              stationStatuses: event.stationStatuses.map(station => station.id === stationId ? { ...station, ...stationUpdates } : station)
            };
          })
        };
      });

      return nextCustomers;
    });

    try {
      await saveCustomers(nextCustomers);
    } catch (error) {
      console.error('Failed saving participant after station update', error);
    }
  };

  const updateEyeExamDecision = async (eventId: string, decision: StationDecision) => {
    let nextCustomers: CustomerRecord[] = [];

    setCustomers(currentCustomers => {
      nextCustomers = currentCustomers.map(customer => {
        if (customer.Email?.toLowerCase() !== selectedEmail.toLowerCase()) {
          return customer;
        }

        return {
          ...customer,
          Events: (customer.Events ?? []).map(event => {
            if (event.id !== eventId) {
              return event;
            }

            return {
              ...event,
              stationStatuses: event.stationStatuses.map(station => {
                if (station.id === 'eye-exam') {
                  return { ...station, decision };
                }

                if (station.id === 'frame-selection') {
                  return { ...station, pboReferralConfirmed: false, frameSelection: '' };
                }

                return station;
              })
            };
          })
        };
      });

      return nextCustomers;
    });

    try {
      await saveCustomers(nextCustomers);
    } catch (error) {
      console.error('Failed saving participant after eye exam update', error);
    }
  };

  const handleAdvanceEvent = (eventId: string, eventStatus: string) => {
    if (eventStatus === 'completed') {
        handleResetEvent(eventId);
        return;
    }
    const currentEvent = participantEvents.find(event => event.id === eventId);

    if (!currentEvent) {
      return;
    }

    const currentStation = currentEvent.stationStatuses.find(station => station.status === 'current');

    if (!currentStation) {
      return;
    }

    if (currentStation.id === 'vision-success') {
      const stationStatuses: StationStatus[] = currentEvent.stationStatuses.map(station =>
        station.id === 'vision-success' ? { ...station, status: 'complete' } : station
      );

      updateEvent(eventId, {
        stationStatuses,
        status: 'completed'
      });
      return;
    }

    if (currentStation.id === 'vision-screening' && (!currentStation.decision || (currentStation.decision !== 'PASS' && currentStation.decision !== 'FAIL'))) {
      return;
    }

    if (currentStation.id === 'eye-exam' && (!currentStation.decision || (currentStation.decision !== 'REFERRAL' && currentStation.decision !== 'FRAME'))) {
      return;
    }

    if (currentStation.id === 'frame-selection') {
      const stationThree = currentEvent.stationStatuses.find(station => station.id === 'eye-exam');
      const stationFour = currentEvent.stationStatuses.find(station => station.id === 'frame-selection');

      if (!stationThree || !stationFour) {
        return;
      }

      if (stationThree.decision === 'REFERRAL' && !stationFour.pboReferralConfirmed) {
        return;
      }

      if (stationThree.decision === 'FRAME' && !stationFour.frameSelection?.trim()) {
        return;
      }
    }

    const currentIndex = currentEvent.stationStatuses.findIndex(station => station.status === 'current');
    const stationStatuses: StationStatus[] = currentEvent.stationStatuses.map((station, index): StationStatus => {
      if (index === currentIndex) {
        return { ...station, status: 'complete' };
      }

      if (currentStation.id === 'vision-screening' && currentStation.decision === 'PASS' && (station.id === 'eye-exam' || station.id === 'frame-selection')) {
        return { ...station, status: 'skipped' };
      }

      return station;
    });

    let nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

    if (currentStation.id === 'vision-screening' && currentStation.decision === 'PASS') {
      nextIndex = stationStatuses.findIndex(station => station.id === 'vision-success');
    }

    if (currentStation.id === 'vision-screening' && currentStation.decision === 'FAIL') {
      nextIndex = stationStatuses.findIndex(station => station.id === 'eye-exam');
    }

    if (currentStation.id === 'eye-exam') {
      nextIndex = stationStatuses.findIndex(station => station.id === 'frame-selection');
    }

    if (currentStation.id === 'frame-selection') {
      nextIndex = stationStatuses.findIndex(station => station.id === 'vision-success');
    }

    if (nextIndex >= 0) {
      stationStatuses[nextIndex] = { ...stationStatuses[nextIndex], status: 'current' };
    }

    const isCompleted = stationStatuses.every(station => station.status === 'complete' || station.status === 'skipped');

    updateEvent(eventId, {
      stationStatuses,
      status: isCompleted ? 'completed' : 'active'
    });
  };

  const handleResetEvent = (eventId: string) => {
    const currentEvent = participantEvents.find(event => event.id === eventId);

    if (!currentEvent) {
      return;
    }

    const stationStatuses = buildStationStatuses();

    updateEvent(eventId, {
      stationStatuses,
      status: 'active'
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    const nextCustomers = customers.map(customer => {
      if (customer.Email?.toLowerCase() !== selectedEmail.toLowerCase()) {
        return customer;
      }

      return {
        ...customer,
        Events: (customer.Events ?? []).filter(event => event.id !== eventId)
      };
    });

    setCustomers(nextCustomers);
    try {
      await saveCustomers(nextCustomers);
    } catch (error) {
      console.error('Failed saving participant after deleting event', error);
    }
  };

  const getProgress = (event: EventRecord) => {
    const completed = event.stationStatuses.filter(station => station.status === 'complete' || station.status === 'skipped').length;
    return Math.round((completed / event.stationStatuses.length) * 100);
  };

  const getStatusLabel = (station: StationStatus) => {
    switch (station.status) {
      case 'complete':
        return 'Complete';
      case 'current':
        return 'In progress';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Pending';
    }
  };

  const handlePrintStationSummary = (event: EventRecord) => {
    const stationTwo = event.stationStatuses.find(station => station.id === 'vision-screening');
    if (!stationTwo || stationTwo.decision !== 'FAIL') {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      return;
    }

    const stationDetails = event.stationStatuses
      .map(station => `- ${station.title}: ${station.status === 'complete' || station.status === 'skipped' ? 'Completed' : 'Pending'}${station.decision ? ` | Decision: ${station.decision}` : ''}`)
      .join('\n');

    printWindow.document.write(`<!doctype html><html><head><title>Station Summary</title><style>body{font-family:Arial,sans-serif;padding:24px;}h1{margin-bottom:8px;}pre{white-space:pre-wrap;}</style></head><body><h1>Participant Station Summary</h1><p><strong>Participant:</strong> ${event.participantEmail}</p><p><strong>Event:</strong> ${event.eventName}</p><pre>${stationDetails}</pre></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    updateEventStation(event.id, 'vision-screening', { printRequested: true });
  };

  const sections = [
    {
      id: 'section-1',
      title: 'Section 1 – Core Participant Info',
      fields: [
        { key: 'participant.participantType', label: 'Participant Type' },
        { key: 'participant.firstName', label: 'First Name' },
        { key: 'participant.lastName', label: 'Last Name' },
        { key: 'participant.dateOfBirth', label: 'Date of Birth' },
        { key: 'participant.ageAtEvent', label: 'Age at Event' }
      ]
    },
    {
      id: 'section-2',
      title: 'Section 2 – Demographics',
      fields: [
        { key: 'participant.demographics.gender', label: 'Gender' },
        { key: 'participant.demographics.race', label: 'Race' },
        { key: 'participant.demographics.ethnicity', label: 'Ethnicity' },
        { key: 'participant.demographics.primaryLanguage', label: 'Primary Language' },
        { key: 'participant.demographics.veteranStatus', label: 'Veteran Status' },
        { key: 'participant.demographics.lgbtqIdentity', label: 'LGBTQ+ Identity' },
        { key: 'participant.demographics.disabilityStatus', label: 'Disability Status' }
      ]
    },
    {
      id: 'section-3',
      title: 'Section 3 – Guardian Information',
      fields: [
        { key: 'participant.guardian.name', label: 'Guardian Name' },
        { key: 'participant.guardian.relationship', label: 'Relationship' },
        { key: 'participant.guardian.phoneNumber', label: 'Guardian Phone' },
        { key: 'participant.guardian.email', label: 'Guardian Email' }
      ]
    },
    {
      id: 'section-4',
      title: 'Section 4 – Contact & Address',
      fields: [
        { key: 'participant.contact.preferredCommunication', label: 'Preferred Communication' },
        { key: 'participant.contact.phoneNumber', label: 'Contact Phone' },
        { key: 'participant.contact.email', label: 'Contact Email' },
        { key: 'participant.address.streetAddress', label: 'Street Address' },
        { key: 'participant.address.city', label: 'City' },
        { key: 'participant.address.state', label: 'State' },
        { key: 'participant.address.zipCode', label: 'ZIP Code' }
      ]
    },
    {
      id: 'section-5',
      title: 'Section 5 – School Information',
      fields: [
        { key: 'participant.school.name', label: 'School Name' },
        { key: 'participant.school.district', label: 'School District' },
        { key: 'participant.school.currentGrade', label: 'Current Grade' }
      ]
    },
    {
      id: 'section-6',
      title: 'Section 6 – Vision & Support Details',
      fields: [
        { key: 'participant.visionIntake.wearsGlasses', label: 'Wears glasses', type: 'select' as const, options: yesNoUnsure },
        { key: 'participant.visionIntake.glassesStatus', label: 'Glasses status' },
        { key: 'participant.visionIntake.wearsContacts', label: 'Wears contacts', type: 'select' as const, options: yesNoUnsure },
        { key: 'participant.visionIntake.lastEyeExam', label: 'Last eye exam', type: 'date' as const },
        { key: 'participant.visionIntake.eyeCareProvider', label: 'Eye care provider' },
        { key: 'participant.visionIntake.toldNeedsGlasses', label: 'Told they need glasses', type: 'select' as const, options: yesNoUnsure },
        { key: 'participant.insurance.visionInsurance', label: 'Vision insurance', type: 'select' as const, options: yesNoUnsure },
        { key: 'participant.insurance.medicalInsuranceProvider', label: 'Medical insurance provider' },
        { key: 'participant.referralSource', label: 'Referral source', type: 'select' as const, options: referralSources },
        { key: 'participant.resourceOther', label: 'Other resource interest' },
        { key: 'participant.consents.electronicSignature', label: 'Electronic signature' },
        { key: 'participant.consents.printedName', label: 'Printed name' },
        { key: 'participant.consents.signatureDate', label: 'Signature date', type: 'date' as const },
        { key: 'participant.checkedIn', label: 'Checked in', type: 'checkbox' as const }
      ]
    }
  ];

  const getNestedValue = (path: string) => {
    const segments = normalizeProfilePath(path).split('.');
    let current: unknown = participantProfile;

    for (const segment of segments) {
      if (current && typeof current === 'object' && segment in current) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return '';
      }
    }

    if (typeof current === 'number') {
      return current;
    }

    return current ?? '';
  };

  const renderField = (field: { key: string; label: string; type?: 'text' | 'date' | 'number' | 'select' | 'checkbox'; options?: string[] }) => {
    const value = getNestedValue(field.key);
    const rawValue = typeof value === 'number' ? String(value) : typeof value === 'boolean' ? String(value) : String(value ?? '');

    if (field.type === 'checkbox') {
      return (
        <label key={field.key} className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => handleProfileChange(field.key, event.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === 'select' && field.options?.length) {
      return (
        <label key={field.key} className="text-sm font-medium text-gray-700">
          {field.label}
          <select
            value={String(value ?? '')}
            onChange={(event) => handleProfileChange(field.key, event.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="">Select one</option>
            {field.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      );
    }

    const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text';

    return (
      <label key={field.key} className="text-sm font-medium text-gray-700">
        {field.label}
        <input
          type={inputType}
          value={rawValue}
          onChange={(event) => handleProfileChange(field.key, event.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
    );
  };

  if (!user) {
    return <div className="max-w-6xl mx-auto px-6 py-12">Please sign in to view this page.</div>;
  }

  if (role !== 'doctor' && role !== 'admin') {
    return <div className="max-w-6xl mx-auto px-6 py-12">You do not have permission to view participants.</div>;
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-12">Loading participants...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">Participants</h1>
          <p className="text-gray-600 mt-2">Browse all participants, update their profile details, and track station-based event progress.</p>
        </div>
        <Link to="/participants" className="text-blue-700 underline">View all</Link>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="border rounded-lg p-4 bg-white shadow-sm">
          <h2 className="font-semibold text-lg mb-3">All participants</h2>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or email"
            className="mb-3 w-full rounded border px-3 py-2 text-sm"
          />
          <div className="space-y-2">
            {filteredCustomers.map(customer => {
              const fullName = `${customer['First Name'] ?? ''} ${customer['Last Name'] ?? ''}`.trim();
              const email = customer.Email ?? '';
              return (
                <button
                  key={email}
                  onClick={() => handleSelect(customer)}
                  className={`w-full text-left rounded-md border px-3 py-2 ${selectedEmail.toLowerCase() === email.toLowerCase() ? 'bg-blue-50 border-blue-400' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className="font-medium">{fullName || 'Unnamed participant'}</div>
                  <div className="text-sm text-gray-500">{email}</div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="border rounded-lg p-6 bg-white shadow-sm">
          {selectedCustomer ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-blue-800">
                    {participant.firstName} {participant.lastName}
                  </h2>
                  <p className="text-gray-600">{selectedCustomer.Email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteParticipant}
                    className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete participant
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(prev => !prev)}
                    className="rounded bg-blue-700 px-4 py-2 text-white"
                  >
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
                  {sections.map(section => (
                    <Accordion
                      key={section.id}
                      expanded={expanded === section.id}
                      onChange={(_, isExpanded) => setExpanded(isExpanded ? section.id : 'section-1')}
                    >
                      <AccordionSummary expandIcon={<span aria-hidden="true">▾</span>}>
                        <span className="font-semibold text-blue-800">{section.title}</span>
                      </AccordionSummary>
                      <AccordionDetails>
                        <div className="grid md:grid-cols-2 gap-4">
                          {section.fields.map(renderField)}
                        </div>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                  <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-base font-semibold text-blue-800">Additional participant details</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2 rounded border border-gray-200 bg-white p-3">
                        <p className="text-sm font-semibold text-gray-800">Current concerns</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {visionConcernOptions.map(concern => (
                            <label key={concern} className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={participantProfile.visionIntake.currentConcerns.includes(concern)}
                                onChange={() => handleProfileArrayToggle('participant.visionIntake.currentConcerns', concern)}
                                className="mt-1"
                              />
                              <span>{concern}</span>
                            </label>
                          ))}
                        </div>
                        <input
                          value={participantProfile.visionIntake.currentConcernsOther}
                          onChange={(event) => handleProfileChange('participant.visionIntake.currentConcernsOther', event.target.value)}
                          placeholder="Other concern"
                          className="mt-3 w-full rounded border px-3 py-2"
                        />
                      </div>

                      <div className="md:col-span-2 rounded border border-gray-200 bg-white p-3">
                        <p className="text-sm font-semibold text-gray-800">Community resource interests</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {resourceOptions.map(resource => (
                            <label key={resource} className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={participantProfile.resourceInterests.includes(resource)}
                                onChange={() => handleProfileArrayToggle('participant.resourceInterests', resource)}
                                className="mt-1"
                              />
                              <span>{resource}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-2 rounded border border-gray-200 bg-white p-3">
                        <p className="text-sm font-semibold text-gray-800">Consents & authorizations</p>
                        <div className="mt-3 space-y-2">
                          {[
                            ['participant.consents.consentToParticipate', 'Consent to participate'],
                            ['participant.consents.photoVideoRelease', 'Photo/video release'],
                            ['participant.consents.communicationAuthorization', 'Communication authorization'],
                            ['participant.consents.acknowledgement', 'Acknowledgement']
                          ].map(([path, label]) => (
                            <label key={path} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={Boolean(getNestedValue(path))}
                                onChange={(event) => handleProfileChange(path, event.target.checked)}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="rounded bg-green-700 px-4 py-2 text-white"
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div><span className="font-semibold">Participant type:</span> {participant.participantType || '—'}</div>
                    <div><span className="font-semibold">Date of birth:</span> {participant.dateOfBirth || '—'}</div>
                    <div><span className="font-semibold">Age at event:</span> {participant.ageAtEvent ?? '—'}</div>
                    <div><span className="font-semibold">Phone:</span> {participant.contact.phoneNumber || '—'}</div>
                    <div><span className="font-semibold">Email:</span> {participant.contact.email || selectedCustomer.Email || '—'}</div>
                    <div><span className="font-semibold">Address:</span> {participant.address.streetAddress ? `${participant.address.streetAddress}, ${participant.address.city}, ${participant.address.state} ${participant.address.zipCode}`.trim() : '—'}</div>
                    <div><span className="font-semibold">Gender:</span> {participant.demographics.gender || '—'}</div>
                    <div><span className="font-semibold">Guardian:</span> {participant.guardian.name || '—'}</div>
                    <div><span className="font-semibold">Checked in:</span> {participant.checkedIn ? 'Yes' : 'No'}</div>
                    <div><span className="font-semibold">Referral source:</span> {participant.referralSource || '—'}</div>
                    <div><span className="font-semibold">Vision insurance:</span> {participant.insurance.visionInsurance || '—'}</div>
                    <div><span className="font-semibold">Resource interests:</span> {participant.resourceInterests.length ? participant.resourceInterests.join(', ') : '—'}</div>
                  </div>

                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-blue-800">Event tracking</h3>
                          <p className="text-sm text-gray-600">Create events and move each participant through the station flow from check-in to the vision success station.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openAddEventModal('all')}
                            className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white"
                          >
                            Add event for everyone
                          </button>
                          <button
                            onClick={() => openAddEventModal('single')}
                            className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white"
                          >
                            Add event
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isAddEventModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
                        <h4 className="text-lg font-semibold text-blue-800">Add event</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          {addEventScope === 'all' ? 'Create a new event for every participant in the list.' : 'Create a new event for the currently selected participant.'}
                        </p>
                        <label className="mt-4 block text-sm font-medium text-gray-700">
                          Event name
                          <input
                            value={eventNameDraft}
                            onChange={(event) => setEventNameDraft(event.target.value)}
                            className="mt-1 w-full rounded border px-3 py-2"
                            placeholder="Community Vision Event"
                          />
                        </label>
                        <div className="mt-5 flex justify-end gap-2">
                          <button
                            onClick={() => setIsAddEventModalOpen(false)}
                            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={confirmAddEvent}
                            className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white"
                          >
                            Create event
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {sortedParticipantEvents.length === 0 ? (
                    <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                      No events yet. Add an event to begin tracking the participant’s station progress.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedParticipantEvents.map(event => {
                        const currentStation = event.stationStatuses.find(station => station.status === 'current');
                        const isCurrentEvent = expandedEventId === event.id;

                        return (
                          <Accordion
                            key={event.id}
                            expanded={isCurrentEvent}
                            onChange={(_, isExpanded) => setExpandedEventId(isExpanded ? event.id : null)}
                            className="rounded-lg border border-gray-200 shadow-sm"
                          >
                            <AccordionSummary expandIcon={<span aria-hidden="true">▾</span>}>
                              <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-blue-800">{event.eventName || 'Untitled event'}</span>
                                  </div>
                                  <div className="text-sm text-gray-600">{event.eventDate || 'No date'}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                                    {event.status === 'completed' ? 'Completed' : event.status === 'active' ? 'In progress' : 'Planned'}
                                  </span>
                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                                    {getProgress(event)}% complete
                                  </span>
                                </div>
                              </div>
                            </AccordionSummary>
                            <AccordionDetails>
                              <div className="rounded-lg border border-gray-200 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="space-y-1">
                                    <input
                                      value={event.eventName}
                                      onChange={(e) => updateEvent(event.id, { eventName: e.target.value })}
                                      className="w-full rounded border px-3 py-2 text-sm font-semibold text-blue-800 md:min-w-[240px]"
                                    />
                                    <input
                                      type="date"
                                      value={event.eventDate}
                                      onChange={(e) => updateEvent(event.id, { eventDate: e.target.value })}
                                      className="rounded border px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                                      {event.status === 'completed' ? 'Completed' : event.status === 'active' ? 'In progress' : 'Planned'}
                                    </span>
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                                      {getProgress(event)}% complete
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-2">
                                  {event.stationStatuses.map(station => (
                                    <div
                                      key={station.id}
                                      className={`rounded border px-3 py-2 ${station.status === 'current' ? 'border-blue-400 bg-blue-50' : station.status === 'complete' ? 'border-green-300 bg-green-50' : station.status === 'skipped' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p className="font-medium text-gray-800">{station.title}</p>
                                          <p className="text-sm text-gray-600">{station.description}</p>
                                        </div>
                                        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-700">
                                          {getStatusLabel(station)}
                                        </span>
                                      </div>

                                      {station.id === 'vision-screening' && (
                                        <div className="mt-3 flex flex-col gap-2 rounded border border-gray-200 bg-white p-3">
                                          <label className="text-sm font-medium text-gray-700">
                                            Screening result
                                            <select
                                              value={station.decision ?? ''}
                                              onChange={(changeEvent) => updateEventStation(event.id, station.id, { decision: changeEvent.target.value as StationDecision })}
                                              className="mt-1 w-full rounded border px-3 py-2"
                                            >
                                              <option value="">Select outcome</option>
                                              <option value="PASS">PASS</option>
                                              <option value="FAIL">FAIL</option>
                                            </select>
                                          </label>
                                          {station.decision === 'FAIL' && (
                                            <button
                                              onClick={() => handlePrintStationSummary(event)}
                                              className="rounded border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700"
                                            >
                                              {station.printRequested ? 'Print summary again' : 'Print station summary'}
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {station.id === 'eye-exam' && (
                                        <div className="mt-3 rounded border border-gray-200 bg-white p-3">
                                          <label className="text-sm font-medium text-gray-700">
                                            Exam outcome
                                            <select
                                              value={station.decision ?? ''}
                                              onChange={(changeEvent) => updateEyeExamDecision(event.id, changeEvent.target.value as StationDecision)}
                                              className="mt-1 w-full rounded border px-3 py-2"
                                            >
                                              <option value="">Select outcome</option>
                                              <option value="REFERRAL">REFERRAL</option>
                                              <option value="FRAME">FRAME</option>
                                            </select>
                                          </label>
                                        </div>
                                      )}

                                      {station.id === 'frame-selection' && (
                                        <div className="mt-3 rounded border border-gray-200 bg-white p-3">
                                          {event.stationStatuses.find(candidate => candidate.id === 'eye-exam')?.decision === 'REFERRAL' ? (
                                            <div className="space-y-2">
                                              <FormControlLabel
                                                control={
                                                  <Checkbox
                                                    checked={station.pboReferralConfirmed ?? false}
                                                    onChange={(changeEvent) => updateEventStation(event.id, station.id, { pboReferralConfirmed: changeEvent.target.checked })}
                                                  />
                                                }
                                                label="PBO Referral"
                                              />
                                              <a
                                                href="https://portal.pbohio.org/civic2/PBO/Login.jsp"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex text-sm font-medium text-blue-700 underline underline-offset-2"
                                              >
                                                Open Prevent Blindness Ohio referral portal
                                              </a>
                                            </div>
                                          ) : event.stationStatuses.find(candidate => candidate.id === 'eye-exam')?.decision === 'FRAME' ? (
                                            <label className="text-sm font-medium text-gray-700">
                                              Frame selection
                                              <input
                                                value={station.frameSelection ?? ''}
                                                onChange={(changeEvent) => updateEventStation(event.id, station.id, { frameSelection: changeEvent.target.value })}
                                                placeholder="Enter frame selection"
                                                className="mt-1 w-full rounded border px-3 py-2"
                                              />
                                            </label>
                                          ) : (
                                            <p className="text-sm text-gray-600">Select an exam outcome on Station 3 first.</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleAdvanceEvent(event.id, event.status)}
                                    disabled={
                                      event.stationStatuses.some(station => station.status === 'current' && station.id === 'vision-screening' && !station.decision) ||
                                      event.stationStatuses.some(station => station.status === 'current' && station.id === 'eye-exam' && !station.decision) ||
                                      (event.stationStatuses.some(station => station.status === 'current' && station.id === 'frame-selection') && (() => {
                                        const stationThree = event.stationStatuses.find(station => station.id === 'eye-exam');
                                        const stationFour = event.stationStatuses.find(station => station.id === 'frame-selection');

                                        if (stationThree?.decision === 'REFERRAL') {
                                          return !(stationFour?.pboReferralConfirmed ?? false);
                                        }

                                        if (stationThree?.decision === 'FRAME') {
                                          return !(stationFour?.frameSelection?.trim());
                                        }

                                        return true;
                                      })())
                                    }
                                    className="rounded bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                                  >
                                    {currentStation?.id === 'vision-success' ? 'Complete' : event.status === 'completed' ? 'Restart flow' : 'Advance to next station'}
                                  </button>
                                  <button
                                    onClick={() => handleResetEvent(event.id)}
                                    className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
                                  >
                                    Reset flow
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700"
                                  >
                                    Delete event
                                  </button>
                                </div>
                              </div>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-600">No participant selected.</p>
          )}
        </section>
      </div>
    </div>
  );
}
