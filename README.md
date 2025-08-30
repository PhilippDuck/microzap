# MicroZap - Lightning Network Artikel-Plattform Prototyp

## Übersicht

MicroZap ist ein Prototyp einer Webplattform für Artikel, die das Lightning Network für Mikrozahlungen und Premium-Abonnements nutzt. Benutzer können sich über LNURL authentifizieren, Artikel lesen und für Premium-Inhalte bezahlen. Das System integriert eine SQLite-Datenbank für Benutzer- und Zahlungsdaten.

## Features

### Backend (Node.js/Express)

- **LNURL-Authentifizierung**: Sichere Anmeldung über Lightning Network Wallets
- **Zahlungsverarbeitung**: Integration mit LNBits für Lightning-Zahlungen
- **Benutzerverwaltung**: JWT-basierte Authentifizierung mit HTTP-Only Cookies
- **Premium-Abonnements**: Zeitbasierte Premium-Zugänge
- **Bezahlte Artikel**: Verfolgung bezahlter Inhalte pro Benutzer
- **SQLite-Datenbank**: Lokale Datenbank für Auth-Anfragen und Benutzerdaten

### Frontend (React/Vite)

- **Responsive Design**: Mit Chakra UI für moderne UI-Komponenten
- **Routing**: React Router für Navigation zwischen Seiten
- **Artikel-Anzeige**: Kartenbasierte Darstellung von Artikeln
- **Profil-Verwaltung**: Benutzerprofil mit Premium-Status
- **Premium-Upgrade**: Seite für Abonnement-Abschluss
- **Authentifizierung**: Login-Dialog mit QR-Code für LNURL

## Technischer Stack

### Backend

- Node.js
- Express.js
- SQLite3
- JWT für Authentifizierung
- LNURL für Lightning-Integration
- QRCode für Authentifizierung
- Axios für HTTP-Anfragen

### Frontend

- React 19
- Vite als Build-Tool
- Chakra UI für UI-Komponenten
- React Router für Navigation
- Axios für API-Kommunikation

## Architektur

Das System besteht aus zwei Hauptkomponenten:

1. **Backend-Server** (`microzap-backend/`):

   - Läuft auf Port 3001
   - Stellt REST-API-Endpunkte bereit
   - Verwaltet Datenbankoperationen
   - Handhabt LNURL-Server für Authentifizierung

2. **Frontend-Anwendung** (`microzap-frontend/`):
   - Läuft auf Vite-Dev-Server (Standard-Port 5173)
   - Verwendet React für komponentenbasierte UI
   - Kommuniziert mit Backend über HTTP-Anfragen

## Installation und Setup

### Voraussetzungen

- Node.js (v16 oder höher)
- npm oder yarn
- LNBits-Instanz für Lightning-Zahlungen (optional für vollständige Funktionalität)

### Backend Setup

```bash
cd microzap-backend
npm install
# Erstelle .env-Datei mit:
# JWT_SECRET=dein-geheimer-key
# LNBITS_URL=https://your-lnbits-instance.com
# INVOICE_READ_KEY=your-invoice-read-key
npm start
```

### Frontend Setup

```bash
cd microzap-frontend
npm install
npm run dev
```

### Vollständige Anwendung starten

1. Backend starten: `cd microzap-backend && npm start`
2. Frontend starten: `cd microzap-frontend && npm run dev`
3. Öffne Browser auf `http://localhost:5173`

## API-Endpunkte

### Authentifizierung

- `GET /lnurl-auth`: Generiert LNURL für Authentifizierung
- `GET /login-status/:k1`: Prüft Authentifizierungsstatus
- `POST /logout`: Abmeldung
- `GET /auth/status`: Authentifizierungsstatus prüfen
- `GET /user-info`: Benutzerinformationen abrufen
- `POST /delete-account`: Konto löschen

### Zahlungen

- `POST /payments`: Zahlung initiieren
- `GET /checkPayment/:paymentHash`: Zahlungsstatus prüfen
- `POST /paidArticles`: Bezahlte Artikel aktualisieren

## Datenbank-Schema

### auth_requests

- `k1`: Einzigartiger Schlüssel für Auth-Anfrage
- `created_at`: Erstellungszeitstempel
- `status`: Status (pending/success)
- `user_id`: Verknüpfte Benutzer-ID

### users

- `id`: Benutzer-ID (Wallet-ID)
- `premium_start`: Startdatum Premium-Abonnement
- `premium_end`: Enddatum Premium-Abonnement
- `paid_articles`: JSON-Array bezahlter Artikel
- `payment_hash`: Hash der letzten Zahlung

## Sicherheit

- JWT-Tokens mit HTTP-Only Cookies
- CORS-Konfiguration für Entwicklung
- Sichere Speicherung sensibler Daten in .env
- SQLite für lokale Datenhaltung

## Prototyp-Einschränkungen

- Lokale SQLite-Datenbank (nicht für Produktion geeignet)
- Einfache Fehlerbehandlung
- Keine umfassenden Tests
- Grundlegende UI ohne vollständiges Styling
- Abhängig von externer LNBits-Instanz

## Entwicklung

### Backend

```bash
cd microzap-backend
npm run dev  # Falls nodemon konfiguriert ist
```

### Frontend

```bash
cd microzap-frontend
npm run lint  # ESLint-Prüfung
npm run build  # Produktionsbuild
npm run preview  # Build-Vorschau
```

## Beitrag

Dies ist ein Prototyp für Demonstrationszwecke. Für Produktionsnutzung sind weitere Entwicklungen notwendig:

- Umstellung auf skalierbare Datenbank (PostgreSQL/MongoDB)
- Umfassende Fehlerbehandlung und Logging
- Sicherheitstests und Penetration-Testing
- Vollständige Testabdeckung
- CI/CD-Pipeline

## Lizenz

ISC License
