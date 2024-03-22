const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'emre12',
    database: 'ticket',
};

// Set up session store
const sessionStore = new MySQLStore({
    host: dbConfig.host,
    port: dbConfig.port || 3306,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
});

app.use(session({
    secret: 'your-secret-key', // Change this to a random, secure string
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
}));

// Serve login.html initially
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

// Handle login POST request
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Check if the provided username and password match a user in the database
        const [rows] = await connection.query(`
            SELECT user_id FROM User WHERE user_name = ? AND user_password = ?
        `, [username, password]);

        connection.end();

        if (rows.length > 0) {
            // Authentication successful, store the user ID in the session
            req.session.userId = rows[0].user_id;
            res.redirect('/index');
        } else {
            // Authentication unsuccessful, send an error message
            res.status(401).send('Invalid username or password. Please try again.');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Serve index.html after successful login
app.get('/index', (req, res) => {
    // Check if the user is logged in (user ID is stored in the session)
    if (!req.session.userId) {
        // Redirect to the login page if not logged in
        res.redirect('/');
        return;
    }

    // Render the index.html page and pass the user ID to the template
    res.sendFile(__dirname + '/index.html');
});


// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.query(`
            SELECT DISTINCT E.*, T.ticket_price,
                (SELECT COUNT(*) FROM Event_Has_Tickets WHERE event_id = E.event_id) AS total_tickets,
                (SELECT COUNT(*) FROM Transaction TR
                    JOIN Ticket TK ON TR.ticket_id = TK.ticket_id
                    JOIN Event_Has_Tickets EHT ON TK.ticket_id = EHT.ticket_id
                    WHERE EHT.event_id = E.event_id) AS sold_tickets
            FROM Event E
            JOIN Event_Has_Tickets EHT ON E.event_id = EHT.event_id
            JOIN Ticket T ON EHT.ticket_id = T.ticket_id
        `);

        connection.end();

        const eventsWithTicketsLeft = rows.map(event => ({
            ...event,
            tickets_left: event.total_tickets - event.sold_tickets
        }));

        res.json(eventsWithTicketsLeft);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Get the history of events a user has tickets for
app.get('/api/user-event-history', async (req, res) => {
    try {
        // Check if the user is logged in (user ID is stored in the session)
        if (!req.session.userId) {
            // Return an empty array if not logged in
            return res.json([]);
        }

        const userId = req.session.userId; // Retrieve user ID from session
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`
            SELECT E.event_name, E.event_date, E.event_time, E.event_adress, E.event_category
            FROM Event E
            JOIN Event_Has_Tickets EHT ON E.event_id = EHT.event_id
            JOIN Ticket T ON EHT.ticket_id = T.ticket_id
            WHERE T.cart_id = (
                SELECT U.cart_id
                FROM User U
                WHERE U.user_id = ?
            )
        `, [userId]);
        connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching user event history:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Calculates the total revenue generated from ticket sales for all events
app.get('/api/all-event-total-revenue', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`
            SELECT E.event_id, E.event_name, SUM(T.ticket_price) AS Total_Revenue
            FROM Event E
            JOIN Event_Has_Tickets EHT ON E.event_id = EHT.event_id
            JOIN Ticket T ON EHT.ticket_id = T.ticket_id
            GROUP BY E.event_id, E.event_name
        `);
        connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching all events total revenue:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Gets events that have at least one ticket priced above the average price of all tickets
app.get('/api/events-above-average-price', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`
            SELECT E.event_id, E.event_name, E.event_date, E.event_time, E.event_adress, E.event_category
            FROM Event E
            WHERE EXISTS (
                SELECT 1
                FROM Event_Has_Tickets EHT
                JOIN Ticket T ON EHT.ticket_id = T.ticket_id
                WHERE EHT.event_id = E.event_id AND T.ticket_price > (
                    SELECT AVG(ticket_price)
                    FROM Ticket
                )
            )
        `);
        connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get events that have no tickets sold
app.get('/api/events-with-no-tickets-sold', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`
            SELECT E.event_id, E.event_name, E.event_date, E.event_time, E.event_adress, E.event_category
            FROM Event E
            WHERE NOT EXISTS (
                SELECT 1
                FROM Event_Has_Tickets EHT
                JOIN Ticket T ON EHT.ticket_id = T.ticket_id
                JOIN Transaction TR ON T.ticket_id = TR.ticket_id
                WHERE EHT.event_id = E.event_id
            )
        `);
        connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching events with no tickets sold:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get users who have bought tickets for 'Concert' category events
app.get('/api/users-who-bought-concert-tickets', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`
            SELECT DISTINCT U.user_id, U.user_name
            FROM User U
            JOIN Transaction T ON U.user_id = T.user_id
            WHERE T.transaction_id IN (
                SELECT T.transaction_id
                FROM Ticket TK
                JOIN Event_Has_Tickets EHT ON TK.ticket_id = EHT.ticket_id
                JOIN Event E ON EHT.event_id = E.event_id
                WHERE E.event_category = 'Concert'
            )
        `);
        connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users who bought concert tickets:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
