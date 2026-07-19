import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type StationDecision = 'PASS' | 'FAIL' | 'REFERRAL' | 'FRAME';

export interface StationStatus {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'complete' | 'skipped';
  decision?: StationDecision;
  printRequested?: boolean;
  pboReferralConfirmed?: boolean;
  frameSelection?: string;
}

export interface EventRecord {
  id: string;
  participantEmail: string;
  eventName: string;
  eventDate: string;
  createdAt: string;
  status: 'planned' | 'active' | 'completed';
  stationStatuses: StationStatus[];
}

export interface ParticipantDemographics {
  gender: string;
  race: string;
  ethnicity: string;
  primaryLanguage: string;
  veteranStatus: string;
  lgbtqIdentity: string;
  disabilityStatus: string;
}

export interface ParticipantGuardian {
  name: string;
  relationship: string;
  phoneNumber: string;
  email: string;
}

export interface ParticipantContact {
  preferredCommunication: string;
  phoneNumber: string;
  email: string;
}

export interface ParticipantAddress {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ParticipantSchool {
  name: string;
  district: string;
  currentGrade: string;
}

export interface ParticipantVisionIntake {
  wearsGlasses: string;
  glassesStatus: string;
  glassesStatusOther: string;
  wearsContacts: string;
  lastEyeExam: string;
  eyeCareProvider: string;
  toldNeedsGlasses: string;
  currentConcerns: string[];
  currentConcernsOther: string;
}

export interface ParticipantInsurance {
  visionInsurance: string;
  medicalInsuranceProvider: string;
}

export interface ParticipantConsents {
  consentToParticipate: boolean;
  photoVideoRelease: boolean;
  communicationAuthorization: boolean;
  acknowledgement: boolean;
  electronicSignature: string;
  printedName: string;
  signatureDate: string;
}

export interface ParticipantProfile {
  id: string;
  participantType: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ageAtEvent: number | null;
  demographics: ParticipantDemographics;
  guardian: ParticipantGuardian;
  contact: ParticipantContact;
  address: ParticipantAddress;
  school: ParticipantSchool;
  visionIntake: ParticipantVisionIntake;
  insurance: ParticipantInsurance;
  resourceInterests: string[];
  resourceOther: string;
  referralSource: string;
  consents: ParticipantConsents;
  checkedIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerValue = string | boolean | number | EventRecord[] | ParticipantProfile | undefined;

export interface CustomerRecord {
  [key: string]: CustomerValue;
  id?: string;
  Email?: string;
  Events?: EventRecord[];
  participant?: ParticipantProfile;
}

const storageKey = 'pvf-participant-events-v1';
const customerStorageKey = 'pvf-participant-customers-v1';
const registrationApiPath = '/api/v1/registration';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function toSerializable(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(item => toSerializable(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [key, toSerializable(entryValue)]));
  }

  return value;
}

function normalizeParticipant(customer: CustomerRecord): ParticipantProfile {
  const existing = customer.participant;
  const legacyAge = typeof customer['Age'] === 'string' ? Number(customer['Age']) : undefined;

  return {
    id: customer.id ?? `participant-${customer.Email ?? Date.now()}`,
    participantType: (typeof customer['Participant Type'] === 'string' && customer['Participant Type']) ? customer['Participant Type'] : existing?.participantType ?? 'Adult (18+)',
    firstName: (typeof customer['First Name'] === 'string' && customer['First Name']) ? customer['First Name'] : existing?.firstName ?? '',
    lastName: (typeof customer['Last Name'] === 'string' && customer['Last Name']) ? customer['Last Name'] : existing?.lastName ?? '',
    dateOfBirth: (typeof customer['Date of Birth'] === 'string' && customer['Date of Birth']) ? customer['Date of Birth'] : existing?.dateOfBirth ?? '',
    ageAtEvent: existing?.ageAtEvent ?? (typeof legacyAge === 'number' && Number.isFinite(legacyAge) ? legacyAge : null),
    demographics: {
      gender: (typeof customer['Gender'] === 'string' && customer['Gender']) ? customer['Gender'] : existing?.demographics.gender ?? '',
      race: (typeof customer['Race'] === 'string' && customer['Race']) ? customer['Race'] : existing?.demographics.race ?? '',
      ethnicity: (typeof customer['Ethnicity'] === 'string' && customer['Ethnicity']) ? customer['Ethnicity'] : existing?.demographics.ethnicity ?? '',
      primaryLanguage: (typeof customer['Primary Language'] === 'string' && customer['Primary Language']) ? customer['Primary Language'] : existing?.demographics.primaryLanguage ?? '',
      veteranStatus: (typeof customer['Veteran Status'] === 'string' && customer['Veteran Status']) ? customer['Veteran Status'] : existing?.demographics.veteranStatus ?? '',
      lgbtqIdentity: existing?.demographics.lgbtqIdentity ?? '',
      disabilityStatus: existing?.demographics.disabilityStatus ?? ''
    },
    guardian: {
      name: (typeof customer['Parent/Guardian Name'] === 'string' && customer['Parent/Guardian Name']) ? customer['Parent/Guardian Name'] : existing?.guardian.name ?? '',
      relationship: (typeof customer['Relationship to Participant'] === 'string' && customer['Relationship to Participant']) ? customer['Relationship to Participant'] : existing?.guardian.relationship ?? '',
      phoneNumber: (typeof customer['Phone Number'] === 'string' && customer['Phone Number']) ? customer['Phone Number'] : existing?.guardian.phoneNumber ?? '',
      email: (typeof customer['Parent/Guardian Email'] === 'string' && customer['Parent/Guardian Email']) ? customer['Parent/Guardian Email'] : (typeof customer['Parent/GauEmail'] === 'string' && customer['Parent/GauEmail']) ? customer['Parent/GauEmail'] : existing?.guardian.email ?? ''
    },
    contact: {
      preferredCommunication: (typeof customer['Preferred Method of Communication'] === 'string' && customer['Preferred Method of Communication']) ? customer['Preferred Method of Communication'] : existing?.contact.preferredCommunication ?? '',
      phoneNumber: (typeof customer['Phone number'] === 'string' && customer['Phone number']) ? customer['Phone number'] : existing?.contact.phoneNumber ?? '',
      email: (typeof customer.Email === 'string' && customer.Email) ? customer.Email : existing?.contact.email ?? ''
    },
    address: {
      streetAddress: (typeof customer['Street Address'] === 'string' && customer['Street Address']) ? customer['Street Address'] : existing?.address.streetAddress ?? '',
      city: (typeof customer['City'] === 'string' && customer['City']) ? customer['City'] : existing?.address.city ?? '',
      state: (typeof customer['State '] === 'string' && customer['State ']) ? customer['State '] : existing?.address.state ?? '',
      zipCode: (typeof customer['ZIP Code'] === 'string' && customer['ZIP Code']) ? customer['ZIP Code'] : existing?.address.zipCode ?? ''
    },
    school: {
      name: (typeof customer['School Name'] === 'string' && customer['School Name']) ? customer['School Name'] : existing?.school.name ?? '',
      district: (typeof customer['School District'] === 'string' && customer['School District']) ? customer['School District'] : existing?.school.district ?? '',
      currentGrade: (typeof customer['Current Grade'] === 'string' && customer['Current Grade']) ? customer['Current Grade'] : existing?.school.currentGrade ?? ''
    },
    visionIntake: {
      wearsGlasses: existing?.visionIntake?.wearsGlasses ?? '',
      glassesStatus: existing?.visionIntake?.glassesStatus ?? '',
      glassesStatusOther: existing?.visionIntake?.glassesStatusOther ?? '',
      wearsContacts: existing?.visionIntake?.wearsContacts ?? '',
      lastEyeExam: existing?.visionIntake?.lastEyeExam ?? '',
      eyeCareProvider: existing?.visionIntake?.eyeCareProvider ?? '',
      toldNeedsGlasses: existing?.visionIntake?.toldNeedsGlasses ?? '',
      currentConcerns: existing?.visionIntake?.currentConcerns ?? [],
      currentConcernsOther: existing?.visionIntake?.currentConcernsOther ?? ''
    },
    insurance: {
      visionInsurance: existing?.insurance?.visionInsurance ?? '',
      medicalInsuranceProvider: existing?.insurance?.medicalInsuranceProvider ?? ''
    },
    resourceInterests: existing?.resourceInterests ?? [],
    resourceOther: existing?.resourceOther ?? '',
    referralSource: existing?.referralSource ?? '',
    consents: {
      consentToParticipate: existing?.consents?.consentToParticipate ?? false,
      photoVideoRelease: existing?.consents?.photoVideoRelease ?? false,
      communicationAuthorization: existing?.consents?.communicationAuthorization ?? false,
      acknowledgement: existing?.consents?.acknowledgement ?? false,
      electronicSignature: existing?.consents?.electronicSignature ?? '',
      printedName: existing?.consents?.printedName ?? '',
      signatureDate: existing?.consents?.signatureDate ?? ''
    },
    checkedIn: existing?.checkedIn ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: existing?.updatedAt ?? new Date().toISOString()
  };
}

export function createDefaultParticipantProfile(): ParticipantProfile {
  return {
    id: '',
    participantType: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    ageAtEvent: null,
    demographics: {
      gender: '',
      race: '',
      ethnicity: '',
      primaryLanguage: '',
      veteranStatus: '',
      lgbtqIdentity: '',
      disabilityStatus: ''
    },
    guardian: {
      name: '',
      relationship: '',
      phoneNumber: '',
      email: ''
    },
    contact: {
      preferredCommunication: '',
      phoneNumber: '',
      email: ''
    },
    address: {
      streetAddress: '',
      city: '',
      state: '',
      zipCode: ''
    },
    school: {
      name: '',
      district: '',
      currentGrade: ''
    },
    visionIntake: {
      wearsGlasses: '',
      glassesStatus: '',
      glassesStatusOther: '',
      wearsContacts: '',
      lastEyeExam: '',
      eyeCareProvider: '',
      toldNeedsGlasses: '',
      currentConcerns: [],
      currentConcernsOther: ''
    },
    insurance: {
      visionInsurance: '',
      medicalInsuranceProvider: ''
    },
    resourceInterests: [],
    resourceOther: '',
    referralSource: '',
    consents: {
      consentToParticipate: false,
      photoVideoRelease: false,
      communicationAuthorization: false,
      acknowledgement: false,
      electronicSignature: '',
      printedName: '',
      signatureDate: ''
    },
    checkedIn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeEventRecord(event: EventRecord): EventRecord {
  return {
    ...event,
    createdAt: event.createdAt || new Date(event.eventDate || new Date().toISOString()).toISOString()
  };
}

function readStoredEvents(): Record<string, EventRecord[]> {
  if (typeof window === 'undefined') {
    return {};
  }

  const storedValue = window.localStorage.getItem(storageKey);
  if (!storedValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(storedValue) as Record<string, EventRecord[]>;
    return parsed;
  } catch {
    return {};
  }
}

function readStoredCustomers(): CustomerRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const storedValue = window.localStorage.getItem(customerStorageKey);
  if (!storedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedValue) as CustomerRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readCustomersFromFirebase(): Promise<CustomerRecord[] | null> {
  try {
    const snapshot = await getDocs(collection(db, 'participants'));

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as Partial<CustomerRecord>;
      const fallbackEmail = typeof data.Email === 'string' ? data.Email.trim() : docSnapshot.id;
      const normalizedEmail = fallbackEmail.toLowerCase();

      return {
        ...(data as CustomerRecord),
        id: data.id ?? docSnapshot.id,
        Email: normalizedEmail,
        participant: data.participant ? data.participant : normalizeParticipant({ ...(data as CustomerRecord), Email: normalizedEmail }),
        Events: Array.isArray(data.Events) ? (data.Events as EventRecord[]).map(normalizeEventRecord) : []
      } satisfies CustomerRecord;
    });
  } catch (error) {
    console.warn('Unable to load participants from Firestore, using local data instead.', error);
    return null;
  }
}

async function readCustomersFromApi(): Promise<CustomerRecord[] | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(registrationApiPath);
    if (!response.ok) {
      throw new Error(`Registration API returned ${response.status}`);
    }

    const data = await response.json() as Partial<CustomerRecord>[];
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    return data.map(customer => {
      const fallbackEmail = typeof customer.Email === 'string' ? customer.Email.trim() : '';
      const normalizedEmail = fallbackEmail.toLowerCase();
      const normalizedCustomer = {
        ...(customer as CustomerRecord),
        Email: normalizedEmail,
      };

      return {
        ...normalizedCustomer,
        participant: normalizedCustomer.participant ?? normalizeParticipant(normalizedCustomer),
        Events: Array.isArray(normalizedCustomer.Events) ? normalizedCustomer.Events.map(normalizeEventRecord) : []
      } satisfies CustomerRecord;
    });
  } catch (error) {
    console.warn('Unable to load participants from the registration API, trying Firestore instead.', error);
    return null;
  }
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  await wait(300);

  const apiCustomers = await readCustomersFromApi();
  if (apiCustomers && apiCustomers.length > 0) {
    return mergeWithStoredEvents(apiCustomers);
  }

  const firebaseCustomers = await readCustomersFromFirebase();
  if (firebaseCustomers && firebaseCustomers.length > 0) {
    return mergeWithStoredEvents(firebaseCustomers);
  }

  const storedEvents = readStoredEvents();
  const storedCustomers = readStoredCustomers();

  return storedCustomers.map(customer => {
    const email = customer.Email?.toLowerCase();
    const persistedEvents = email ? storedEvents[email] ?? [] : [];
    const normalizedEvents = persistedEvents.map(normalizeEventRecord);

    return {
      ...customer,
      Email: customer.Email ?? '',
      participant: customer.participant ?? normalizeParticipant(customer),
      Events: customer.Events ?? normalizedEvents
    };
  });
}

function mergeWithStoredEvents(customers: CustomerRecord[]): CustomerRecord[] {
  const storedEvents = readStoredEvents();

  return customers.map(customer => {
    const email = customer.Email?.toLowerCase();
    const persistedEvents = email ? storedEvents[email] ?? [] : [];
    const sourceEvents = Array.isArray(customer.Events) ? customer.Events.map(normalizeEventRecord) : [];
    const eventsToUse = sourceEvents.length > 0 ? sourceEvents : persistedEvents.map(normalizeEventRecord);

    return {
      ...customer,
      Email: customer.Email ?? '',
      participant: customer.participant ?? normalizeParticipant(customer),
      Events: eventsToUse
    };
  });
}

export async function saveCustomers(customers: CustomerRecord[]): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const eventMap = customers.reduce<Record<string, EventRecord[]>>((accumulator, customer) => {
    if (customer.Email) {
      accumulator[customer.Email.toLowerCase()] = (customer.Events ?? []).map(normalizeEventRecord);
    }
    return accumulator;
  }, {});

  window.localStorage.setItem(storageKey, JSON.stringify(eventMap));
  window.localStorage.setItem(customerStorageKey, JSON.stringify(customers.map(customer => ({
    ...customer,
    participant: customer.participant ? toSerializable(customer.participant) as ParticipantProfile : undefined,
    Events: (customer.Events ?? []).map(normalizeEventRecord)
  }))));

  try {
    await Promise.all(customers.map((customer, index) => {
      const normalizedEmail = customer.Email?.trim().toLowerCase();
      const documentId = normalizedEmail || customer.id || `customer-${index}`;
      const payload = toSerializable({
        ...customer,
        Email: normalizedEmail ?? customer.Email
      }) as Record<string, unknown>;
      return setDoc(doc(db, 'participants', documentId), payload, { merge: true });
    }));
  } catch (error) {
    console.warn('Unable to save participants to Firestore; local storage was updated instead.', error);
  }
}

export async function saveRegistrationCustomer(customer: CustomerRecord): Promise<void> {
  await saveCustomerToRegistrationApi(customer);
  saveCustomerToLocalStorage(customer);
}

async function saveCustomerToRegistrationApi(customer: CustomerRecord): Promise<void> {
  const normalizedEmail = customer.Email?.trim().toLowerCase();
  const payload = toSerializable({
    ...customer,
    Email: normalizedEmail ?? customer.Email
  });

  const response = await fetch(registrationApiPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Registration API returned ${response.status}`);
  }
}

function saveCustomerToLocalStorage(customer: CustomerRecord) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedEmail = customer.Email?.trim().toLowerCase();
  const storedCustomers = readStoredCustomers();
  const nextCustomers = normalizedEmail
    ? [
      ...storedCustomers.filter(storedCustomer => storedCustomer.Email?.trim().toLowerCase() !== normalizedEmail),
      customer
    ]
    : [...storedCustomers, customer];

  window.localStorage.setItem(customerStorageKey, JSON.stringify(nextCustomers.map(storedCustomer => ({
    ...storedCustomer,
    participant: storedCustomer.participant ? toSerializable(storedCustomer.participant) as ParticipantProfile : undefined,
    Events: (storedCustomer.Events ?? []).map(normalizeEventRecord)
  }))));
}

export async function getCustomerByEmail(email: string): Promise<CustomerRecord | undefined> {
  const customers = await getCustomers();
  return customers.find(customer => customer.Email?.toLowerCase() === email.toLowerCase());
}

export async function getCustomersFromFirebase(): Promise<CustomerRecord[]> {
  // Replace this with your Firebase query later.
  return getCustomers();
}
