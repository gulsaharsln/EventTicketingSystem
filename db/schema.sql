CREATE TABLE "User" (
    user_id INTEGER PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_password VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL
);

CREATE TABLE "Transaction" (
    transaction_id INTEGER PRIMARY KEY,
    transaction_amount DOUBLE,
    transaction_date DATE,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

CREATE TABLE Ticket (
    ticket_id INTEGER PRIMARY KEY,
    ticket_price DOUBLE,
    cart_id INTEGER,
    FOREIGN KEY (cart_id) REFERENCES Cart(cart_id)
);

CREATE TABLE Event (
    event_id INTEGER PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE,
    event_time TIME,
    event_address VARCHAR(255) NOT NULL,
    event_category VARCHAR(255) NOT NULL
);

CREATE TABLE Cart (
    cart_id INTEGER PRIMARY KEY
);

CREATE TABLE User_Has_Cart (
    user_id INTEGER,
    cart_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id),
    FOREIGN KEY (cart_id) REFERENCES Cart(cart_id),
    PRIMARY KEY (user_id, cart_id)
);

CREATE TABLE Event_Has_Tickets (
    event_id INTEGER,
    ticket_id INTEGER,
    FOREIGN KEY (event_id) REFERENCES Event(event_id),
    FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id),
    PRIMARY KEY (event_id, ticket_id)
);
