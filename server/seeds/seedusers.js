'use strict';

const bcrypt = require('bcryptjs');
const User = require('../models/User');

const DEFAULT_PASSWORD = 'Kmrl@123';
const ADMIN_EMAIL = 'hariprasathmani102@gmail.com';

const seedUserBlueprints = [
  {
    name: 'Hari Prasath',
    email: ADMIN_EMAIL,
    role: 'Admin',
    // Admins have no scoped department — full access is granted via role.
    status: 'Active',
  },
  { name: 'Arun Kumar', email: 'finance1@kmrl.local', role: 'Department Officer', department: 'Finance', status: 'Active' },
  { name: 'Priya Raman', email: 'finance2@kmrl.local', role: 'Department Officer', department: 'Finance', status: 'Active' },
  { name: 'Vignesh S', email: 'finance3@kmrl.local', role: 'Department Officer', department: 'Finance', status: 'Active' },
  { name: 'Meena Krishnan', email: 'hr1@kmrl.local', role: 'Department Officer', department: 'HR', status: 'Active' },
  { name: 'Rahul Nair', email: 'hr2@kmrl.local', role: 'Department Officer', department: 'HR', status: 'Active' },
  { name: 'Divya S', email: 'hr3@kmrl.local', role: 'Department Officer', department: 'HR', status: 'Active' },
  { name: 'Suresh Babu', email: 'legal1@kmrl.local', role: 'Department Officer', department: 'Legal', status: 'Active' },
  { name: 'Anjali Menon', email: 'legal2@kmrl.local', role: 'Department Officer', department: 'Legal', status: 'Active' },
  { name: 'Rohit Sharma', email: 'legal3@kmrl.local', role: 'Department Officer', department: 'Legal', status: 'Active' },
  { name: 'Karthik Raj', email: 'operations1@kmrl.local', role: 'Department Officer', department: 'Operations', status: 'Active' },
  { name: 'Ajith Kumar', email: 'operations2@kmrl.local', role: 'Department Officer', department: 'Operations', status: 'Active' },
  { name: 'Naveen R', email: 'operations3@kmrl.local', role: 'Department Officer', department: 'Operations', status: 'Active' },
  { name: 'Ramesh Kumar', email: 'safety1@kmrl.local', role: 'Department Officer', department: 'Safety', status: 'Active' },
  { name: 'Sanjay P', email: 'safety2@kmrl.local', role: 'Department Officer', department: 'Safety', status: 'Active' },
  { name: 'Vinod K', email: 'safety3@kmrl.local', role: 'Department Officer', department: 'Safety', status: 'Active' },
  { name: 'Anitha Devi', email: 'it1@kmrl.local', role: 'Department Officer', department: 'IT', status: 'Active' },
  { name: 'Prakash M', email: 'it2@kmrl.local', role: 'Department Officer', department: 'IT', status: 'Active' },
  { name: 'Keerthana R', email: 'it3@kmrl.local', role: 'Department Officer', department: 'IT', status: 'Active' },
];

const buildSeedUsers = async () => {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  return seedUserBlueprints.map((user) => ({
    ...user,
    email: user.email.toLowerCase(),
    password: passwordHash,
  }));
};

async function seedUsers() {
  try {
    const seedPayload = await buildSeedUsers();
    const operations = seedPayload.map((user) => ({
      updateOne: {
        filter: { email: user.email },
        update: {
          $set: {
            name: user.name,
            email: user.email,
            password: user.password,
            role: user.role,
            department: user.department,
            status: user.status,
          },
        },
        upsert: true,
      },
    }));

    const result = await User.bulkWrite(operations, { ordered: true });

    console.log(
      `Default users verified successfully. Created ${result.upsertedCount || 0} and updated ${result.modifiedCount || 0} seed accounts.`
    );
  } catch (error) {
    console.error('Failed to seed default users:', error.message);
    throw error;
  }
}

module.exports = seedUsers;
