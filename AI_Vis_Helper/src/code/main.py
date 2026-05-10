import pandas as pd
import io
import os # Import the os module

# 1. Define the path to the CSV file
csv_file_name = "data.csv"
csv_file_folder = "data"

# Determine the current script's directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Build absolute paths using os.path.join
csv_file_path = os.path.join(current_dir, '..', csv_file_folder, csv_file_name)

# 2. Read the CSV file into a pandas DataFrame
try:
    # Specify 'utf-8' encoding for reading the CSV, as it may contain Vietnamese characters
    df = pd.read_csv(csv_file_path, encoding='utf-8')

    # --- Start General Analysis ---
    analysis_output = io.StringIO()

    analysis_output.write("--- General Dataset Analysis ---\n\n")

    # 1. Records: Number of rows and columns
    analysis_output.write(f"Dataset Shape (Rows, Columns): {df.shape}\n\n")

    # 2. Types: Data types and non-null counts
    analysis_output.write("--- Column Information (Data Types, Non-Null Counts) ---\n")
    df.info(buf=analysis_output)
    analysis_output.write("\n")

    # 3. Distributions: Descriptive statistics for numerical columns
    analysis_output.write("--- Descriptive Statistics for Numerical Columns ---\n")
    analysis_output.write(df.describe().to_string())
    analysis_output.write("\n\n")

    # 4. Distributions: Value counts for key categorical columns
    analysis_output.write("--- Value Counts for Key Categorical Columns ---\n")
    categorical_cols = ['gender', 'married', 'active_member', 'exit', 'customer_segment',
                        'loyalty_level', 'digital_behavior', 'risk_segment', 'cluster_group', 'occupation']
    
    for col in categorical_cols:
        if col in df.columns:
            analysis_output.write(f"\n--- {col} Value Counts ---\n")
            analysis_output.write(df[col].value_counts().to_string())
            analysis_output.write("\n")
        else:
            analysis_output.write(f"\nWarning: Column '{col}' not found in DataFrame.\n")

    # Define the output path for the analysis report
    output_txt_file_name = "general_analysis_report.txt"
    output_txt_file_folder = "knowledge"
    output_txt_file_path = os.path.join(current_dir, '..', output_txt_file_folder, output_txt_file_name)

    # Save the analysis output to a text file
    # Specify 'utf-8' encoding when writing to handle non-ASCII characters
    with open(output_txt_file_path, "w", encoding='utf-8') as f:
        f.write(analysis_output.getvalue())

    print(f"Successfully performed general analysis and saved report to: {output_txt_file_path}")

except FileNotFoundError:
    print(f"Error: The file '{csv_file_path}' was not found. Please ensure the CSV file is in the '{csv_file_folder}' directory relative to main.py.")
except UnicodeEncodeError as e:
    print(f"Error: A character encoding issue occurred when writing the file. This is likely due to non-ASCII characters in the data (e.g., Vietnamese names) and the system's default encoding not supporting them. The code has been modified to explicitly use 'utf-8' encoding. Original error: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
