import * as XLSX from 'xlsx';
import * as path from 'path';

const demoData = [
  {
    Account_ID: 'ACC-8801',
    Company_Name: 'Apex Cloud Solutions',
    Contact_Person: 'Sarah Jenkins',
    Email: 's.jenkins@apexcloud.io',
    City: 'Seattle',
    State: 'WA',
    Zip_Code: '98101',
    Latitude: 47.6062,
    Longitude: -122.3321,
    Annual_Revenue: 450000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8802',
    Company_Name: 'Silicon Valley Robotics',
    Contact_Person: 'Kenji Takahashi',
    Email: 'ktakahashi@svrobotics.com',
    City: 'San Francisco',
    State: 'CA',
    Zip_Code: '94105',
    Latitude: 37.7749,
    Longitude: -122.4194,
    Annual_Revenue: 820000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8803',
    Company_Name: 'Red Rock Logistics',
    Contact_Person: 'David Miller',
    Email: 'dmiller@redrocklog.com',
    City: 'Phoenix',
    State: 'AZ',
    Zip_Code: '85001',
    Latitude: 33.4484,
    Longitude: -112.074,
    Annual_Revenue: 195000,
    Customer_Tier: 'Mid-Market'
  },
  {
    Account_ID: 'ACC-8804',
    Company_Name: 'Mile High Biotech',
    Contact_Person: 'Claire Bennett',
    Email: 'cbennett@milehighbio.org',
    City: 'Denver',
    State: 'CO',
    Zip_Code: '80202',
    Latitude: 39.7392,
    Longitude: -104.9903,
    Annual_Revenue: 340000,
    Customer_Tier: 'Mid-Market'
  },
  {
    Account_ID: 'ACC-8805',
    Company_Name: 'Windy City Financial',
    Contact_Person: 'Michael Chang',
    Email: 'mchang@windycityfin.com',
    City: 'Chicago',
    State: 'IL',
    Zip_Code: '60601',
    Latitude: 41.8781,
    Longitude: -87.6298,
    Annual_Revenue: 980000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8806',
    Company_Name: 'Motor City Precision Parts',
    Contact_Person: 'Robert Lewandowski',
    Email: 'robert@motorcityparts.com',
    City: 'Detroit',
    State: 'MI',
    Zip_Code: '48201',
    Latitude: 42.3314,
    Longitude: -83.0458,
    Annual_Revenue: 610000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8807',
    Company_Name: 'Buckeye Distribution Hub',
    Contact_Person: 'Amanda Foster',
    Email: 'afoster@buckeyedist.com',
    City: 'Columbus',
    State: 'OH',
    Zip_Code: '43215',
    Latitude: 39.9612,
    Longitude: -82.9988,
    Annual_Revenue: 280000,
    Customer_Tier: 'Mid-Market'
  },
  {
    Account_ID: 'ACC-8808',
    Company_Name: 'Twin Cities Retail Tech',
    Contact_Person: 'Lars Lindqvist',
    Email: 'llindqvist@twincitiesretail.com',
    City: 'Minneapolis',
    State: 'MN',
    Zip_Code: '55401',
    Latitude: 44.9778,
    Longitude: -93.265,
    Annual_Revenue: 215000,
    Customer_Tier: 'Mid-Market'
  },
  {
    Account_ID: 'ACC-8809',
    Company_Name: 'Space City Energy Group',
    Contact_Person: 'Carlos Ramirez',
    Email: 'cramirez@spacecityenergy.com',
    City: 'Houston',
    State: 'TX',
    Zip_Code: '77002',
    Latitude: 29.7604,
    Longitude: -95.3698,
    Annual_Revenue: 1250000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8810',
    Company_Name: 'Lone Star Health Systems',
    Contact_Person: 'Jessica Sterling',
    Email: 'jsterling@lonestarhealth.org',
    City: 'Dallas',
    State: 'TX',
    Zip_Code: '75201',
    Latitude: 32.7767,
    Longitude: -96.797,
    Annual_Revenue: 780000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8811',
    Company_Name: 'Austin NextGen AI',
    Contact_Person: 'Devon Patel',
    Email: 'devon@austinnextgen.ai',
    City: 'Austin',
    State: 'TX',
    Zip_Code: '78701',
    Latitude: 30.2672,
    Longitude: -97.7431,
    Annual_Revenue: 530000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8812',
    Company_Name: 'Peachtree Cargo Solutions',
    Contact_Person: 'Tamara Washington',
    Email: 'twashington@peachtreecargo.com',
    City: 'Atlanta',
    State: 'GA',
    Zip_Code: '30303',
    Latitude: 33.749,
    Longitude: -84.388,
    Annual_Revenue: 690000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8813',
    Company_Name: 'Biscayne Marine & Freight',
    Contact_Person: 'Frank Castiglione',
    Email: 'frank@biscaynemail.com',
    City: 'Miami',
    State: 'FL',
    Zip_Code: '33101',
    Latitude: 25.7617,
    Longitude: -80.1918,
    Annual_Revenue: 490000,
    Customer_Tier: 'Mid-Market'
  },
  {
    Account_ID: 'ACC-8814',
    Company_Name: 'Music City Soundware',
    Contact_Person: 'Hannah Brooks',
    Email: 'hbrooks@musiccitysound.com',
    City: 'Nashville',
    State: 'TN',
    Zip_Code: '37201',
    Latitude: 36.1627,
    Longitude: -86.7816,
    Annual_Revenue: 175000,
    Customer_Tier: 'SMB'
  },
  {
    Account_ID: 'ACC-8815',
    Company_Name: 'Gotham Capital Management',
    Contact_Person: 'Arthur Campbell',
    Email: 'acampbell@gothamcap.com',
    City: 'New York',
    State: 'NY',
    Zip_Code: '10005',
    Latitude: 40.7128,
    Longitude: -74.006,
    Annual_Revenue: 1600000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8816',
    Company_Name: 'Commonwealth BioPharma',
    Contact_Person: 'Dr. Evelyn Vance',
    Email: 'evance@commonwealthbio.com',
    City: 'Boston',
    State: 'MA',
    Zip_Code: '02110',
    Latitude: 42.3601,
    Longitude: -71.0589,
    Annual_Revenue: 940000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8817',
    Company_Name: 'Liberty Bell Precision',
    Contact_Person: 'Danielle Rossi',
    Email: 'drossi@libertyprecision.com',
    City: 'Philadelphia',
    State: 'PA',
    Zip_Code: '19104',
    Latitude: 39.9526,
    Longitude: -75.1652,
    Annual_Revenue: 310000,
    Customer_Tier: 'Mid-Market'
  },
  {
    Account_ID: 'ACC-8818',
    Company_Name: 'Chesapeake Maritime Defense',
    Contact_Person: 'Col. Raymond Shaw',
    Email: 'rshaw@chesapeakedefense.gov.us',
    City: 'Baltimore',
    State: 'MD',
    Zip_Code: '21202',
    Latitude: 39.2904,
    Longitude: -76.6122,
    Annual_Revenue: 1100000,
    Customer_Tier: 'Enterprise'
  },
  {
    Account_ID: 'ACC-8819',
    Company_Name: 'Aloha Pacific Marine',
    Contact_Person: 'Keanu Mahoe',
    Email: 'keanu@alohapacific.com',
    City: 'Honolulu',
    State: 'HI',
    Zip_Code: '96813',
    Latitude: 21.3069,
    Longitude: -157.8583,
    Annual_Revenue: 220000,
    Customer_Tier: 'Mid-Market'
  },
  {
    Account_ID: 'ACC-8820',
    Company_Name: 'Sierra Nevada Microbrew Co',
    Contact_Person: 'Brett Zimmerman',
    Email: 'bzimmerman@sierranvbrew.com',
    City: 'Reno',
    State: 'NV',
    Zip_Code: '89501',
    Latitude: 39.5296,
    Longitude: -119.8138,
    Annual_Revenue: 135000,
    Customer_Tier: 'SMB'
  }
];

const worksheet = XLSX.utils.json_to_sheet(demoData);

// Set column widths
worksheet['!cols'] = [
  { wch: 12 }, // Account_ID
  { wch: 28 }, // Company_Name
  { wch: 22 }, // Contact_Person
  { wch: 30 }, // Email
  { wch: 16 }, // City
  { wch: 8 },  // State
  { wch: 10 }, // Zip_Code
  { wch: 12 }, // Latitude
  { wch: 12 }, // Longitude
  { wch: 16 }, // Annual_Revenue
  { wch: 14 }, // Customer_Tier
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer Leads');

const outputPath = path.resolve(process.cwd(), 'demo_customer_leads.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`✅ Successfully generated demo Excel file at: ${outputPath}`);
