# uvicorn main:app --reload
# pip install -r requirements.txt

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import pyodbc
import snowflake.connector
import pandas as pd
import os
import toml
import re
import yaml

app = FastAPI()

allow_origins=["http://000.000.000.000:5173"]


origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://000.000.000.000:5173",  # ? Add this here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # ? Use the list above
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ Load Configuration from .streamlit/secrets.toml
SECRETS_FILE = ".streamlit/secrets.toml"

if not os.path.exists(SECRETS_FILE):
    raise FileNotFoundError(f"❌ Configuration file '{SECRETS_FILE}' not found!")

config = toml.load(SECRETS_FILE)

# ✅ OpenAI API Key
OPENAI_API_KEY = config["openai"]["api_key"]

if not OPENAI_API_KEY:
    raise ValueError("❌ OpenAI API Key not found in .streamlit/secrets.toml")

client = openai.OpenAI(api_key=OPENAI_API_KEY)

# ✅ Store Chat History in Memory
chat_history = []
query_results = {}

class QueryRequest(BaseModel):
    database: str
    query: str
    model: str  # ✅ Dynamically choose AI model
    follow_up: bool = False  # ✅ Follow-up flag
    previous_query: str = ""  # ✅ Add previous query field


# ✅ Function to Load Schema from .txt Files
def load_schema(db_choice):
    schema_file = f"schemas/{db_choice.lower()}.yaml"
    if os.path.exists(schema_file):
        with open(schema_file, "r") as f:
            return yaml.safe_load(f)  # ✅ Properly parse YAML into a dictionary
    return {}

def fetch_valid_table(db_choice):
    schema_content = load_schema(db_choice)

    if not schema_content:
        print(f"❌ Error: Schema file for '{db_choice}' not found or empty.")
        raise HTTPException(status_code=400, detail=f"Schema file for '{db_choice}' not found or empty.")

    if "tables" in schema_content and isinstance(schema_content["tables"], list) and schema_content["tables"]:
        table_info = schema_content["tables"][0]  # ✅ Extract first table info
        table_name = table_info["name"]
        database_name = table_info["base_table"]["database"]  # ✅ Extract database name
        schema_name = table_info["base_table"]["schema"]  # ✅ Extract schema name
    else:
        print(f"❌ Error: Table details missing in schema file for '{db_choice}'.")
        raise HTTPException(status_code=400, detail=f"Table details missing in schema file for '{db_choice}'.")

    print(f"✅ Using table '{table_name}' from schema '{schema_name}' in database '{database_name}'")  # Debug log
    return database_name, schema_name, table_name




# ✅ Function to Get Database Connection
def get_db_connection(db_choice):
    if db_choice not in config:
        raise HTTPException(status_code=400, detail=f"Invalid database choice: {db_choice}")

    db_config = config[db_choice]

    try:
        if db_choice == "Property":  # ✅ Use Snowflake for Property Database
            print(f"✅ Connecting to Snowflake: {db_config['database']} on {db_config['server']}")
            conn = snowflake.connector.connect(
                user=db_config["user"],
                password=db_config["password"],
                account=db_config["server"],
                warehouse=db_config["warehouse"],
                database=db_config["database"],
                schema=db_config["schema"],
                role=db_config["role"]
            )
        else:  # ✅ Use ODBC (SQL Server) for Farm and Business
            print(f"✅ Connecting to SQL Server: {db_config['database']} on {db_config['server']}")
            conn_str = (
                f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                f"SERVER=tcp:{db_config['server']},1433;"
                f"DATABASE={db_config['database']};"
                f"UID={db_config['user']};"
                f"PWD={db_config['password']};"
                f"Encrypt=yes;TrustServerCertificate=yes;"
                f"Connection Timeout=30;"
            )
            conn = pyodbc.connect(conn_str, timeout=30)

        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

@app.post("/generate_sql/")
def generate_sql(query_data: QueryRequest):
    db_choice = query_data.database
    user_query = query_data.query
    model = query_data.model
    follow_up = query_data.follow_up
    previous_query = query_data.previous_query if follow_up else ""

    # ? Fetch database, schema, and table dynamically
    database_name, schema_name, selected_table = fetch_valid_table(db_choice)
    table_schema = load_schema(db_choice)

    # ? If follow-up is enabled, modify the previous SQL
    if follow_up and previous_query:
        clean_previous_query = previous_query.strip().rstrip(';')
        previous_sql = f"Here is the last SQL query:\n{clean_previous_query}\nModify it based on user's follow-up request."
    else:
        previous_sql = ""


    prompt = f"""
    You are an AI SQL query generator. Generate an optimized SQL query for the `{db_choice}` database.
    - **Ensure the correct table name is `{database_name}.{schema_name}.{selected_table}`**.
    - **Use only valid column names from this table**.
    - **If the user has requested a follow-up, refine the previous query accordingly**.
    - **For SQL Server (like Farm or Business DBs), use **TOP n** instead of LIMIT**.

    **Table Schema:**  
    {table_schema}

    {previous_sql}

    **User Query:** {user_query}

    **SQL Output:**
    """

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )

    sql_query = response.choices[0].message.content.strip()
    sql_query_clean = re.sub(r"^\s*SQL\s*", "", sql_query.replace("```sql", "").replace("```", "").strip())

    # ? SQL Server-specific fix: Replace LIMIT with TOP
    if db_choice in ["Farm", "Business"]:
        limit_match = re.search(r"LIMIT\s+(\d+)", sql_query_clean, re.IGNORECASE)
        if limit_match:
            limit_value = limit_match.group(1)
            # Insert TOP n after SELECT
            sql_query_clean = re.sub(r"SELECT\s+", f"SELECT TOP {limit_value} ", sql_query_clean, count=1, flags=re.IGNORECASE)
            # Remove the LIMIT clause
            sql_query_clean = re.sub(r"LIMIT\s+\d+", "", sql_query_clean, flags=re.IGNORECASE)


    # ? Store SQL query in history
    chat_history.append({"query": user_query, "sql_query": sql_query_clean})

    return {"sql_query": sql_query_clean}


@app.post("/execute_sql/")
def execute_sql(query_data: QueryRequest):
    db_choice = query_data.database
    sql_query = query_data.query
    model = query_data.model
    prompt = query_data.previous_query  # Use the original prompt in response generation

    # ? Dynamically fetch database, schema, and table
    database_name, schema_name, selected_table = fetch_valid_table(db_choice)

    print(f"?? Executing SQL in database: {db_choice}")
    print(f"?? Executing SQL query: {sql_query}")
    print(f"?? Selected Model: {model}")
    print(f"?? Executing prompt: {prompt}")
    
    conn = get_db_connection(db_choice)
    cursor = conn.cursor()

    try:
        cursor.execute(sql_query)
        results = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else ["Result"]
        df = pd.DataFrame([list(row) for row in results], columns=columns) if results else pd.DataFrame(columns=columns)
        conn.close()

        query_result = df.to_dict(orient="records")
        if not query_result:
            return {"response": "No data found for the given query.", "chart_data": []}

        print(f"? SQL Query Result: {query_result}")
        formatted_result = "\n".join([f"{row}" for row in query_result])

        # Initialize numerical_columns as an empty list at the start
        numerical_columns = []

        # Special logic for Customers database
        if db_choice == "Customers":
            # Check if SQL contains COUNT(*)
            has_count = "COUNT(*)" in sql_query.upper()

            # Disable chart if no numerical data
            if not numerical_columns and not has_count:
                chart_data = []  # No chart for non-numeric data
            else:
                chart_data = query_result  # Provide chart data for queries that can be charted

            # First, generate the natural language response (if applicable)
            prompt_nl = f"""
            Based on the user's request and the SQL results, generate a human-friendly response.
            **User Query:** {prompt}
            **SQL Result:**  
            {formatted_result}
            Please provide a natural language summary without showing SQL query. Structure output using bullet points as needed, and format the response in HTML for inline embed.
            """
            nl_response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt_nl}]
            ).choices[0].message.content.strip()

            # Count words in the AI response (not the prompt)
            response_word_count = len(nl_response.split())
            print(f"response_word_count : {response_word_count}")

            # Logic 1: If AI response > 150 words, show only prompt + chart
            if response_word_count > 150:
                response = f"Query: {prompt}"
                chart_data = query_result  # Provide chart data
            # Logic 2: If AI response <= 150 words OR query contains COUNT(*), use natural language
            elif response_word_count <= 150 or has_count:
                response = nl_response
                chart_data = query_result
            # Logic 3: For other cases, format a user-friendly response dynamically
            else:
                # Initialize the column_types dictionary to store column type classifications
                column_types = {}

                for col in columns:
                    # Get the types of values in this column
                    value_types = set(type(row[col]).__name__ for row in query_result if row[col] is not None)
                    
                    if "str" in value_types:
                        # Classify as 'text' if the column contains strings
                        column_types[col] = "text"
                    elif "int" in value_types or "float" in value_types:
                        # Classify as 'number' if the column contains integers or floats
                        column_types[col] = "number"
                    elif "datetime" in value_types:
                        # Classify as 'date' if the column contains datetime or date values
                        column_types[col] = "date"
                    else:
                        # Classify as 'other' for any other type (e.g., boolean, complex)
                        column_types[col] = "other"

                # Now, you can proceed with dynamic processing based on column types
                numerical_columns = [col for col, col_type in column_types.items() if col_type == "number"]
                text_columns = [col for col, col_type in column_types.items() if col_type == "text"]
                date_columns = [col for col, col_type in column_types.items() if col_type == "date"]
                other_columns = [col for col, col_type in column_types.items() if col_type == "other"]

                # Use text_columns (since they are the columns with string data) for name-like data
                if text_columns:
                    # If text-like columns are present, format as a list of names
                    formatted_list = []
                    for row in query_result:
                        # Construct the name from available text columns (e.g., first name, last name, etc.)
                        name_parts = [str(row[col]) for col in text_columns if row[col]]
                        name = " ".join(name_parts)
                        # Add the name to the formatted list
                        formatted_list.append(f"- {name}")

                    # If there are any date or other types of columns, you can include them as well
                    if date_columns or other_columns:
                        for row in query_result:
                            row_str = ", ".join([f"{key}: {value}" for key, value in row.items() if value is not None])
                            formatted_list.append(f"- {row_str}")

                    # response = f"Here are the customers based on your query:\n" + "\n".join(formatted_list)
                    response = "<p><strong>Here are the customers based on your query:</strong></p><ul>" + "".join([f"<li>{item}</li>" for item in formatted_list]) + "</ul>"

                else:
                    # If no text columns are found, handle the result as a generic list of key-value pairs
                    formatted_list = []
                    for row in query_result:
                        row_str = ", ".join([f"{key}: {value}" for key, value in row.items() if value is not None])
                        formatted_list.append(f"- {row_str}")
                    response = f"Here are the results based on your query:\n" + "\n".join(formatted_list)

        else:
            prompt_nl = f"""
            Based on the user's request and the SQL results, generate a human-friendly response.
            **User Query:** {prompt}
            **SQL Result:**  
            {formatted_result}
            Please provide a natural language summary without showing SQL query.
            """
            nl_response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt_nl}]
            ).choices[0].message.content.strip()

            if query_result:
                formatted_list = []
                for row in query_result:
                    row_str = ", ".join([f"{key}: {value}" for key, value in row.items() if value is not None])
                    formatted_list.append(f"<li>{row_str}</li>")

                response = f"<p>{nl_response}</p>"
            else:
                response = f"<p>{nl_response}</p>"

            chart_data = query_result


        print(f"? AI Response: {response}")
        return {
            "response": response,
            "chart_data": chart_data
        }

    except Exception as e:
        error_message = str(e)
        print(f"? SQL Execution Error: {error_message}")
        return {"response": f"?? Error processing request: {error_message}"}



# ? Test Route for CORS
@app.get("/")
def read_root():
    return {"message": "FastAPI is running with CORS enabled"}



