import express from "express";
import mysql from "mysql2/promise";
import bodyParser from "body-parser";
import 'dotenv/config';

const PORT = process.env.PORT;
const app = express();
app.use(bodyParser.json());

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRadian = (angle) => (Math.PI / 180) * angle;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadian(lat2 - lat1);
  const dLon = toRadian(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadian(lat1)) *
      Math.cos(toRadian(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

app.post("/addSchool", async (req, res) => {
  const { name, address, latitude, longitude } = req.body;
  if (!name || !address || !latitude || !longitude) {
    return res.status(400).send("All fields are required");
  }
  try {
    const query = "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
    await pool.execute(query, [
      name,
      address,
      latitude,
      longitude,
    ]);

    res.status(201).send("School added successfully.");
  } catch (err) {
    res.status(500).send("An error occurred while adding the school.");
    console.error(err);
  }
});

app.get("/listSchools", async (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).send("Latitude and longitude not found");
  }
  try {
    const query = "SELECT * FROM schools";
    const [results] = await pool.execute(query);
    const resultsDis = results.map((school) => ({
        ...school,
        distance: calculateDistance(
          latitude,
          longitude,
          school.latitude,
          school.longitude
        ),
      }))
    const sortedSchools = resultsDis.sort((a, b) => a.distance - b.distance);
    res.json(sortedSchools);
  } catch (err) {
    res.status(500).send("An error occurred while fetching schools");
    console.error(err);
  }
});

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(PORT, () => {
  console.log(`Server Initialised on http://localhost:${PORT}`);
});
