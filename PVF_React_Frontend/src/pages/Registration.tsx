import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { ReactNode } from 'react'
import Button from '@mui/material/Button'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import { saveRegistrationCustomer, type CustomerRecord, type EventRecord, type ParticipantProfile, type StationStatus } from '../DataControl'

type RegistrationForm = {
  event: string
  participantType: string
  firstName: string
  lastName: string
  dateOfBirth: string
  age: string
  gender: string
  race: string
  ethnicity: string
  primaryLanguage: string
  veteranStatus: string
  lgbtqIdentity: string
  disabilityStatus: string
  guardianName: string
  guardianRelationship: string
  guardianPhone: string
  guardianEmail: string
  streetAddress: string
  city: string
  state: string
  zipCode: string
  preferredCommunication: string
  schoolName: string
  schoolDistrict: string
  currentGrade: string
  wearsGlasses: string
  glassesStatus: string
  glassesStatusOther: string
  wearsContacts: string
  lastEyeExam: string
  eyeCareProvider: string
  toldNeedsGlasses: string
  currentConcerns: string[]
  currentConcernsOther: string
  visionInsurance: string
  medicalInsuranceProvider: string
  resourceInterests: string[]
  resourceOther: string
  referralSource: string
  consentParticipate: boolean
  photoVideoRelease: boolean
  communicationAuthorization: boolean
  acknowledgement: boolean
  electronicSignature: string
  printedName: string
  signatureDate: string
}

type ContactField = 'guardianPhone' | 'guardianEmail'

type RegistrationSubmissionPayload = {
  participant: ParticipantProfile
  requestedEventName: string
  submissionMeta: {
    source: 'public-registration-page'
    preparedAt: string
    clientVersion: 'registration-page-v1'
  }
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const createInitialForm = (): RegistrationForm => ({
  event: 'Community Vision Event',
  participantType: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  age: '',
  gender: '',
  race: '',
  ethnicity: '',
  primaryLanguage: '',
  veteranStatus: '',
  lgbtqIdentity: '',
  disabilityStatus: '',
  guardianName: '',
  guardianRelationship: '',
  guardianPhone: '',
  guardianEmail: '',
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  preferredCommunication: '',
  schoolName: '',
  schoolDistrict: '',
  currentGrade: '',
  wearsGlasses: '',
  glassesStatus: '',
  glassesStatusOther: '',
  wearsContacts: '',
  lastEyeExam: '',
  eyeCareProvider: '',
  toldNeedsGlasses: '',
  currentConcerns: [],
  currentConcernsOther: '',
  visionInsurance: '',
  medicalInsuranceProvider: '',
  resourceInterests: [],
  resourceOther: '',
  referralSource: '',
  consentParticipate: false,
  photoVideoRelease: false,
  communicationAuthorization: false,
  acknowledgement: false,
  electronicSignature: '',
  printedName: '',
  signatureDate: new Date().toISOString().slice(0, 10),
})

const defaultEventName = 'Community Vision Event'

const participantTypes = ['Child (Ages 5-17)', 'Adult (18+)']
const communicationMethods = ['Phone', 'Text Message', 'Email']
const yesNoUnsure = ['Yes', 'No', 'Unsure']
const glassesStatuses = [
  'In their possession and worn regularly',
  'Broken',
  'Lost',
  'Left at home',
  'No longer fit or prescription is outdated',
  'Other',
]
const currentConcernOptions = [
  'Difficulty seeing the board',
  'Blurry vision',
  'Frequent headaches',
  'Squinting',
  'Holds books or devices very close',
  'Eye strain',
  'Double vision',
  'No current concerns',
]
const resourceOptions = [
  'Food Assistance',
  'Housing Resources',
  'Employment Services',
  'Financial Literacy',
  'Health & Wellness Programs',
  'Youth Programs',
  'Veteran Resources',
  'Senior Resources',
  'Vision Care Resources',
]

const isContactField = (field: keyof RegistrationForm): field is ContactField =>
  field === 'guardianPhone' || field === 'guardianEmail'

const normalizePhoneNumber = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const normalizeText = (value: string) => value.trim()

const createParticipantId = (form: RegistrationForm, preparedAt: string) => {
  const readableName = `${form.firstName}-${form.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const timestamp = preparedAt.replace(/[^0-9]/g, '').slice(0, 14)

  return `participant-${readableName || 'registration'}-${timestamp}`
}

const createRegistrationSubmissionPayload = (form: RegistrationForm): RegistrationSubmissionPayload => {
  const preparedAt = new Date().toISOString()
  const normalizedPhone = normalizePhoneNumber(form.guardianPhone)
  const normalizedEmail = normalizeEmail(form.guardianEmail)
  const ageAtEvent = Number.parseInt(form.age, 10)

  return {
    participant: {
      id: createParticipantId(form, preparedAt),
      participantType: form.participantType,
      firstName: normalizeText(form.firstName),
      lastName: normalizeText(form.lastName),
      dateOfBirth: form.dateOfBirth,
      ageAtEvent: Number.isFinite(ageAtEvent) ? ageAtEvent : null,
      demographics: {
        gender: form.gender,
        race: form.race,
        ethnicity: form.ethnicity,
        primaryLanguage: form.primaryLanguage,
        veteranStatus: form.veteranStatus,
        lgbtqIdentity: form.lgbtqIdentity,
        disabilityStatus: form.disabilityStatus,
      },
      guardian: {
        name: form.participantType === 'Child (Ages 5-17)' ? normalizeText(form.guardianName) : '',
        relationship: form.participantType === 'Child (Ages 5-17)' ? normalizeText(form.guardianRelationship) : '',
        phoneNumber: form.participantType === 'Child (Ages 5-17)' ? normalizedPhone : '',
        email: form.participantType === 'Child (Ages 5-17)' ? normalizedEmail : '',
      },
      contact: {
        preferredCommunication: form.preferredCommunication,
        phoneNumber: normalizedPhone,
        email: normalizedEmail,
      },
      address: {
        streetAddress: normalizeText(form.streetAddress),
        city: normalizeText(form.city),
        state: normalizeText(form.state),
        zipCode: normalizeText(form.zipCode),
      },
      school: {
        name: form.participantType === 'Child (Ages 5-17)' ? normalizeText(form.schoolName) : '',
        district: form.participantType === 'Child (Ages 5-17)' ? normalizeText(form.schoolDistrict) : '',
        currentGrade: form.participantType === 'Child (Ages 5-17)' ? normalizeText(form.currentGrade) : '',
      },
      visionIntake: {
        wearsGlasses: form.wearsGlasses,
        glassesStatus: form.glassesStatus,
        glassesStatusOther: normalizeText(form.glassesStatusOther),
        wearsContacts: form.wearsContacts,
        lastEyeExam: form.lastEyeExam,
        eyeCareProvider: normalizeText(form.eyeCareProvider),
        toldNeedsGlasses: form.toldNeedsGlasses,
        currentConcerns: form.currentConcerns,
        currentConcernsOther: normalizeText(form.currentConcernsOther),
      },
      insurance: {
        visionInsurance: form.visionInsurance,
        medicalInsuranceProvider: normalizeText(form.medicalInsuranceProvider),
      },
      resourceInterests: form.resourceInterests,
      resourceOther: normalizeText(form.resourceOther),
      referralSource: form.referralSource,
      consents: {
        consentToParticipate: form.consentParticipate,
        photoVideoRelease: form.photoVideoRelease,
        communicationAuthorization: form.communicationAuthorization,
        acknowledgement: form.acknowledgement,
        electronicSignature: normalizeText(form.electronicSignature),
        printedName: normalizeText(form.printedName),
        signatureDate: form.signatureDate,
      },
      checkedIn: false,
      createdAt: preparedAt,
      updatedAt: preparedAt,
    },
    requestedEventName: form.event,
    submissionMeta: {
      source: 'public-registration-page',
      preparedAt,
      clientVersion: 'registration-page-v1',
    },
  }
}
const referralSources = [
  'Social Media',
  'School',
  'Community Partner',
  'Church/Faith Organization',
  'Healthcare Provider',
  'Friend/Family',
  'Motorsure America',
  'Prevent Blindness Ohio',
  'Other',
]

function buildStationStatuses(): StationStatus[] {
  return [
    {
      id: 'check-in',
      title: 'Station 1 – Check-In',
      description: 'Verify registration, confirm consent, and assign the participant ID.',
      status: 'current',
    },
    {
      id: 'vision-screening',
      title: 'Station 2 – Vision Screening',
      description: 'Record vision screening results and route the participant to the next step.',
      status: 'pending',
    },
    {
      id: 'eye-exam',
      title: 'Station 3 – Comprehensive Eye Exam',
      description: 'Provide a full exam and note prescription or referral outcomes.',
      status: 'pending',
    },
    {
      id: 'frame-selection',
      title: 'Station 4 – Frame Selection',
      description: 'Record prescription details and frame selections for ordering.',
      status: 'pending',
    },
    {
      id: 'vision-success',
      title: 'Station 5 – Vision Success',
      description: 'Confirm next steps, referrals, and follow-up resources before departure.',
      status: 'pending',
    },
  ]
}

function buildRegistrationEvent(payload: RegistrationSubmissionPayload): EventRecord {
  const today = new Date().toISOString().slice(0, 10)

  return {
    id: `${payload.participant.contact.email}-${Date.now()}`,
    participantEmail: payload.participant.contact.email,
    eventName: payload.requestedEventName || defaultEventName,
    eventDate: today,
    createdAt: payload.submissionMeta.preparedAt,
    status: 'active',
    stationStatuses: buildStationStatuses(),
  }
}

function createCustomerRecordFromPayload(payload: RegistrationSubmissionPayload): CustomerRecord {
  const { participant } = payload

  return {
    id: participant.id,
    Email: participant.contact.email,
    'First Name': participant.firstName,
    'Last Name': participant.lastName,
    'Participant Type': participant.participantType,
    'Date of Birth': participant.dateOfBirth,
    Age: String(participant.ageAtEvent ?? ''),
    Gender: participant.demographics.gender,
    Race: participant.demographics.race,
    Ethnicity: participant.demographics.ethnicity,
    'Primary Language': participant.demographics.primaryLanguage,
    'Veteran Status': participant.demographics.veteranStatus,
    'Parent/Guardian Name': participant.guardian.name,
    'Relationship to Participant': participant.guardian.relationship,
    'Phone Number': participant.contact.phoneNumber,
    'Parent/Guardian Email': participant.contact.email,
    'Street Address': participant.address.streetAddress,
    City: participant.address.city,
    'State ': participant.address.state,
    'ZIP Code': participant.address.zipCode,
    'Preferred Method of Communication': participant.contact.preferredCommunication,
    'School Name': participant.school.name,
    'School District': participant.school.district,
    'Current Grade': participant.school.currentGrade,
    participant,
    Events: [buildRegistrationEvent(payload)],
  }
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <span className="text-sm font-semibold text-gray-800">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </span>
  )
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: ReactNode
}) {
  return (
    <Accordion defaultExpanded disableGutters className="rounded-lg border border-gray-200 bg-white shadow-sm before:hidden">
      <AccordionSummary expandIcon={<span aria-hidden="true">▾</span>}>
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-bold text-blue-800">{title}</h2>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
      </AccordionDetails>
    </Accordion>
  )
}

export default function Registration() {
  const [form, setForm] = useState<RegistrationForm>(() => createInitialForm())
  const [submitted, setSubmitted] = useState(false)
  const [submissionPayload, setSubmissionPayload] = useState<RegistrationSubmissionPayload | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')

  const isChild = form.participantType === 'Child (Ages 5-17)'
  const phoneDigits = form.guardianPhone.replace(/\D/g, '')
  const phoneInvalid =
    form.guardianPhone.trim() !== '' &&
    !(phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith('1')))
  const emailInvalid =
    form.guardianEmail.trim() !== '' &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guardianEmail.trim())
  const requiredConsentComplete =
    form.consentParticipate &&
    form.communicationAuthorization &&
    form.acknowledgement &&
    form.electronicSignature.trim() &&
    form.printedName.trim() &&
    form.signatureDate

  const requiredValues = useMemo(() => {
    const requiredValues = [
      form.participantType,
      form.firstName,
      form.lastName,
      form.dateOfBirth,
      form.age,
      form.preferredCommunication,
      form.wearsGlasses,
      form.wearsContacts,
      form.toldNeedsGlasses,
      form.visionInsurance,
      form.referralSource,
      form.guardianEmail,
      form.electronicSignature,
      form.printedName,
      form.signatureDate,
    ]

    if (isChild) {
      requiredValues.push(
        form.guardianName,
        form.guardianRelationship,
        form.guardianPhone,
        form.guardianEmail,
        form.streetAddress,
        form.city,
        form.state,
        form.zipCode,
        form.schoolName,
        form.schoolDistrict,
        form.currentGrade,
      )
    }

    return requiredValues
  }, [form, isChild])

  const requiredFieldsComplete = requiredValues.every(Boolean)

  const completionCount = useMemo(() => {
    const completedFields = requiredValues.filter(Boolean).length
    const completedConsents = [
      form.consentParticipate,
      form.communicationAuthorization,
      form.acknowledgement,
    ].filter(Boolean).length

    return `${completedFields + completedConsents}/${requiredValues.length + 3}`
  }, [form, requiredValues])

  const updateField = (field: keyof RegistrationForm, value: string | boolean | string[]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setSubmitted(false)
    setSubmissionPayload(null)
    setSaveStatus('idle')
    setSaveError('')
  }

  const handleInput =
    (field: keyof RegistrationForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      updateField(field, event.target.value)
    }

  const toggleArrayValue = (field: 'currentConcerns' | 'resourceInterests', value: string) => {
    setForm((current) => {
      const currentValues = current[field]
      let nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]

      if (field === 'currentConcerns' && value === 'No current concerns' && !currentValues.includes(value)) {
        nextValues = ['No current concerns']
      }

      if (field === 'currentConcerns' && value !== 'No current concerns') {
        nextValues = nextValues.filter((item) => item !== 'No current concerns')
      }

      return { ...current, [field]: nextValues }
    })
    setSubmitted(false)
    setSubmissionPayload(null)
    setSaveStatus('idle')
    setSaveError('')
  }

  const handleReset = () => {
    setForm(createInitialForm())
    setSubmitted(false)
    setSubmissionPayload(null)
    setSaveStatus('idle')
    setSaveError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requiredFieldsComplete || phoneInvalid || emailInvalid) return

    const payload = createRegistrationSubmissionPayload(form)
    setSubmissionPayload(payload)
    setSaveStatus('saving')
    setSaveError('')

    try {
      await saveRegistrationCustomer(createCustomerRecordFromPayload(payload))
      setSubmitted(true)
      setSaveStatus('saved')
    } catch (error) {
      console.error('Failed to save registration', error)
      setSaveStatus('error')
      setSaveError('Unable to save this registration to the database. Please try again or contact an administrator.')
    }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100'
  const selectClass = `${inputClass} bg-white`
  const invalidInputClass = `${inputClass} border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-100`
  const canReviewRegistration = Boolean(requiredFieldsComplete && requiredConsentComplete && !phoneInvalid && !emailInvalid)

  const renderContactInput = (field: ContactField, label: string, required = false) => {
    const isPhone = field === 'guardianPhone'
    const isEmail = field === 'guardianEmail'
    const invalid = (isPhone && phoneInvalid) || (isEmail && emailInvalid)
    const message = isPhone
      ? 'Enter a valid 10-digit phone number.'
      : 'Enter a valid email address, such as name@example.com.'

    return (
      <label key={field}>
        <FieldLabel required={required}>{label}</FieldLabel>
        <input
          type={isEmail ? 'email' : isPhone ? 'tel' : 'text'}
          value={String(form[field])}
          onChange={handleInput(field)}
          className={invalid ? invalidInputClass : inputClass}
          required={required}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${field}-error` : undefined}
        />
        {invalid ? (
          <p id={`${field}-error`} className="mt-1 text-sm font-medium text-red-700">
            {message}
          </p>
        ) : null}
      </label>
    )
  }

  return (
    <main className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Prime Focus Inc.
            </p>
            <h1 className="mt-2 text-4xl font-bold text-blue-900">
              Community Vision Event Registration
            </h1>
            <p className="mt-3 max-w-3xl text-gray-700">
              Children ages 5-17 receive priority scheduling. Adults are welcome to register
              and may be scheduled if appointment availability permits.
            </p>
          </div>

          <aside className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">Required progress</p>
            <p className="mt-2 text-3xl font-bold text-blue-800">{completionCount}</p>
            <p className="mt-2 text-sm text-gray-600">Complete required fields to save the registration.</p>
          </aside>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {saveStatus === 'error' ? (
            <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
              <p className="font-semibold">Unable to save registration</p>
              <p className="mt-2">{saveError}</p>
            </section>
          ) : null}
          <Section eyebrow="Section 1" title="Event Registration">
            <div className="rounded border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 md:col-span-2">
              This registration is for the Community Vision Event, so no event selection is needed.
            </div>

            <label>
              <FieldLabel required>Participant Type</FieldLabel>
              <select
                value={form.participantType}
                onChange={handleInput('participantType')}
                className={selectClass}
                required
              >
                <option value="">Select participant type</option>
                {participantTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </Section>

          <Section eyebrow="Section 2" title="Participant Information">
            {[
              ['firstName', 'First Name', true],
              ['lastName', 'Last Name', true],
              ['dateOfBirth', 'Date of Birth', true],
              ['age', 'Age', true],
              ['gender', 'Gender', false],
              ['race', 'Race', false],
              ['ethnicity', 'Ethnicity', false],
              ['primaryLanguage', 'Primary Language', false],
              ['veteranStatus', 'Veteran Status', false],
              ['lgbtqIdentity', 'LGBTQ+ Identity (Optional)', false],
              ['disabilityStatus', 'Disability Status (Optional)', false],
            ].map(([field, label, required]) => (
              <label key={String(field)}>
                <FieldLabel required={Boolean(required)}>{String(label)}</FieldLabel>
                <input
                  type={field === 'dateOfBirth' ? 'date' : field === 'age' ? 'number' : 'text'}
                  value={String(form[field as keyof RegistrationForm])}
                  onChange={handleInput(field as keyof RegistrationForm)}
                  className={inputClass}
                  required={Boolean(required)}
                />
              </label>
            ))}
          </Section>

          {isChild ? (
            <>
              <Section eyebrow="Section 3" title="Parent/Guardian Information">
                {[
                  ['guardianName', 'Parent/Guardian Name'],
                  ['guardianRelationship', 'Relationship to Participant'],
                  ['guardianPhone', 'Phone Number'],
                  ['guardianEmail', 'Email Address'],
                  ['streetAddress', 'Street Address'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['zipCode', 'ZIP Code'],
                ].map(([field, label]) => {
                  const formField = field as keyof RegistrationForm

                  return isContactField(formField)
                    ? renderContactInput(formField, label, true)
                    : (
                      <label key={field}>
                        <FieldLabel required>{label}</FieldLabel>
                        <input
                          value={String(form[formField])}
                          onChange={handleInput(formField)}
                          className={inputClass}
                          required
                        />
                      </label>
                    )
                })}
                <label>
                  <FieldLabel required>Preferred Method of Communication</FieldLabel>
                  <select
                    value={form.preferredCommunication}
                    onChange={handleInput('preferredCommunication')}
                    className={selectClass}
                    required
                  >
                    <option value="">Select a method</option>
                    {communicationMethods.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </label>
              </Section>

              <Section eyebrow="Section 4" title="School Information">
                {[
                  ['schoolName', 'School Name'],
                  ['schoolDistrict', 'School District'],
                  ['currentGrade', 'Current Grade'],
                ].map(([field, label]) => (
                  <label key={field}>
                    <FieldLabel required>{label}</FieldLabel>
                    <input
                      value={String(form[field as keyof RegistrationForm])}
                      onChange={handleInput(field as keyof RegistrationForm)}
                      className={inputClass}
                      required
                    />
                  </label>
                ))}
              </Section>
            </>
          ) : (
            <Section eyebrow="Section 3" title="Contact Information">
              <label>
                <FieldLabel required>Preferred Method of Communication</FieldLabel>
                <select
                  value={form.preferredCommunication}
                  onChange={handleInput('preferredCommunication')}
                  className={selectClass}
                  required
                >
                  <option value="">Select a method</option>
                  {communicationMethods.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </label>
              {[
                ['guardianPhone', 'Phone Number'],
                ['guardianEmail', 'Email Address'],
                ['streetAddress', 'Street Address'],
                ['city', 'City'],
                ['state', 'State'],
                ['zipCode', 'ZIP Code'],
              ].map(([field, label]) => {
                const formField = field as keyof RegistrationForm

                return isContactField(formField)
                  ? renderContactInput(formField, label, formField === 'guardianEmail')
                  : (
                    <label key={field}>
                      <FieldLabel>{label}</FieldLabel>
                      <input
                        value={String(form[formField])}
                        onChange={handleInput(formField)}
                        className={inputClass}
                      />
                    </label>
                  )
              })}
            </Section>
          )}

          <Section eyebrow="Section 5" title="Vision History">
            <label>
              <FieldLabel required>Does the participant currently wear glasses?</FieldLabel>
              <select value={form.wearsGlasses} onChange={handleInput('wearsGlasses')} className={selectClass} required>
                <option value="">Select one</option>
                {yesNoUnsure.slice(0, 2).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            {form.wearsGlasses === 'Yes' ? (
              <>
                <label>
                  <FieldLabel>If yes, are the glasses currently:</FieldLabel>
                  <select value={form.glassesStatus} onChange={handleInput('glassesStatus')} className={selectClass}>
                    <option value="">Select status</option>
                    {glassesStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                {form.glassesStatus === 'Other' ? (
                  <label>
                    <FieldLabel>Other glasses status</FieldLabel>
                    <input value={form.glassesStatusOther} onChange={handleInput('glassesStatusOther')} className={inputClass} />
                  </label>
                ) : null}
              </>
            ) : null}

            <label>
              <FieldLabel required>Does the participant wear contact lenses?</FieldLabel>
              <select value={form.wearsContacts} onChange={handleInput('wearsContacts')} className={selectClass} required>
                <option value="">Select one</option>
                {yesNoUnsure.slice(0, 2).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <FieldLabel>Date of Last Eye Exam</FieldLabel>
              <input type="date" value={form.lastEyeExam} onChange={handleInput('lastEyeExam')} className={inputClass} />
            </label>

            <label>
              <FieldLabel>Name of Eye Care Provider (Optional)</FieldLabel>
              <input value={form.eyeCareProvider} onChange={handleInput('eyeCareProvider')} className={inputClass} />
            </label>

            <label>
              <FieldLabel required>Has the participant ever been told they need glasses?</FieldLabel>
              <select
                value={form.toldNeedsGlasses}
                onChange={handleInput('toldNeedsGlasses')}
                className={selectClass}
                required
              >
                <option value="">Select one</option>
                {yesNoUnsure.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <fieldset className="md:col-span-2">
              <legend className="text-sm font-semibold text-gray-800">
                Is the participant currently experiencing any of the following?
              </legend>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {currentConcernOptions.map((concern) => (
                  <label key={concern} className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={form.currentConcerns.includes(concern)}
                      onChange={() => toggleArrayValue('currentConcerns', concern)}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">{concern}</span>
                  </label>
                ))}
              </div>
              <input
                value={form.currentConcernsOther}
                onChange={handleInput('currentConcernsOther')}
                placeholder="Other concern"
                className={`${inputClass} mt-3`}
              />
            </fieldset>

            <p className="rounded bg-blue-50 p-3 text-sm text-blue-900 md:col-span-2">
              The condition or availability of glasses will not prevent participation in the event.
            </p>
          </Section>

          <Section eyebrow="Section 6" title="Insurance Information">
            <div className="rounded bg-green-50 p-3 text-sm text-green-900 md:col-span-2">
              Insurance information is optional, collected for program planning and reporting only.
              Prime Focus Inc. will not bill insurance, and insurance status will not affect eligibility.
            </div>
            <label>
              <FieldLabel required>Does the participant currently have vision insurance?</FieldLabel>
              <select
                value={form.visionInsurance}
                onChange={handleInput('visionInsurance')}
                className={selectClass}
                required
              >
                <option value="">Select one</option>
                {yesNoUnsure.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Medical Insurance Provider (Optional)</FieldLabel>
              <input
                value={form.medicalInsuranceProvider}
                onChange={handleInput('medicalInsuranceProvider')}
                className={inputClass}
              />
            </label>
          </Section>

          <Section eyebrow="Section 7" title="Community Resource Interests">
            <fieldset className="md:col-span-2">
              <legend className="text-sm font-semibold text-gray-800">
                Would you like information about any of the following community resources?
              </legend>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {resourceOptions.map((resource) => (
                  <label key={resource} className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={form.resourceInterests.includes(resource)}
                      onChange={() => toggleArrayValue('resourceInterests', resource)}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">{resource}</span>
                  </label>
                ))}
              </div>
              <input
                value={form.resourceOther}
                onChange={handleInput('resourceOther')}
                placeholder="Other resource interest"
                className={`${inputClass} mt-3`}
              />
            </fieldset>
          </Section>

          <Section eyebrow="Section 8" title="How did you hear about this event?">
            <label className="md:col-span-2">
              <FieldLabel required>Referral Source</FieldLabel>
              <select value={form.referralSource} onChange={handleInput('referralSource')} className={selectClass} required>
                <option value="">Select one</option>
                {referralSources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </label>
          </Section>

          <Section eyebrow="Section 9" title="Consents & Authorizations">
            <div className="space-y-3 md:col-span-2">
              {[
                [
                  'consentParticipate',
                  'Consent to Participate',
                  'I authorize Prime Focus Inc. and its licensed healthcare partners to conduct a vision screening and, if applicable, provide information regarding recommended follow-up care.',
                  true,
                ],
                [
                  'photoVideoRelease',
                  'Photo & Video Release',
                  'I grant permission for Prime Focus Inc. to photograph or record me and/or my child during the event for educational, promotional, fundraising, and marketing purposes.',
                  false,
                ],
                [
                  'communicationAuthorization',
                  'Communication Authorization',
                  'I authorize Prime Focus Inc. to contact me by phone, email, and/or text message regarding event updates, follow-up information, community resources, and future Prime Focus programs.',
                  true,
                ],
                [
                  'acknowledgement',
                  'Acknowledgement',
                  'I certify that the information provided is true and accurate to the best of my knowledge.',
                  true,
                ],
              ].map(([field, title, body, required]) => (
                <label key={String(field)} className="flex gap-3 rounded border border-gray-200 bg-gray-50 p-3">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field as keyof RegistrationForm])}
                    onChange={(event) => updateField(field as keyof RegistrationForm, event.target.checked)}
                    required={Boolean(required)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-gray-900">
                      {String(title)}{required ? <span className="text-red-600"> *</span> : null}
                    </span>
                    <span className="text-sm text-gray-700">{String(body)}</span>
                  </span>
                </label>
              ))}
            </div>

            <label>
              <FieldLabel required>Electronic Signature</FieldLabel>
              <input value={form.electronicSignature} onChange={handleInput('electronicSignature')} className={inputClass} required />
            </label>
            <label>
              <FieldLabel required>Printed Name</FieldLabel>
              <input value={form.printedName} onChange={handleInput('printedName')} className={inputClass} required />
            </label>
            <label>
              <FieldLabel required>Date</FieldLabel>
              <input type="date" value={form.signatureDate} onChange={handleInput('signatureDate')} className={inputClass} required />
            </label>
          </Section>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-blue-900">Registration Submission</h2>
              <p className="text-sm text-gray-600">
                This page is ready to save the registration to the participant database.
              </p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outlined" onClick={handleReset}>
                Reset
              </Button>
              <Button type="submit" variant="contained" disabled={!canReviewRegistration || saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving...' : 'Save Registration'}
              </Button>
            </div>
          </div>
        </form>

        {submitted ? (
          <section className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
            <h2 className="text-xl font-bold text-green-900">Registration saved</h2>
            <p className="mt-2 text-green-900">
              {submissionPayload?.participant.firstName} {submissionPayload?.participant.lastName} has been saved for {submissionPayload?.requestedEventName || defaultEventName}.
            </p>
            {submissionPayload ? (
              <details className="mt-4 rounded border border-green-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-green-900">
                  View prepared registration payload
                </summary>
                <pre className="mt-3 max-h-96 overflow-auto rounded bg-gray-950 p-4 text-xs text-gray-50">
                  {JSON.stringify(submissionPayload, null, 2)}
                </pre>
              </details>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  )
}
