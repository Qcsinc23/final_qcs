# QCS Event App

This is the QCS Event Management Application.

## Description

A Flask-based web application for managing events, clients, equipment, and more.

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd qcs_event_app
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Initialize the database:
    ```bash
    python init_db.py
    ```

## Usage

Run the Flask development server:
```bash
flask run
```
Access the application at `http://127.0.0.1:5000` (or the port specified by Flask).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)