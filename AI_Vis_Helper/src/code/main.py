import pandas as pd

# 1. Define the path to the CSV file
csv_file_name = "data.csv"
csv_file_folder = "data"
csv_file_path = f"../{csv_file_folder}/{csv_file_name}"

# 2. Read the CSV file into a pandas DataFrame
try:
    # Specify 'utf-8' encoding for reading the CSV, as it may contain Vietnamese characters
    df = pd.read_csv(csv_file_path, encoding='utf-8')

    # 3. Get the first 10 rows of the DataFrame
    first_10_rows = df.head(10)

    # 4. Define the output path for the text file
    output_txt_file_name = "first_10_rows.txt"
    output_txt_file_folder = "knowledge" # Changed output folder to 'knowledge'
    output_txt_file_path = f"../{output_txt_file_folder}/{output_txt_file_name}"

    # 5. Save the first 10 rows to a text file
    # Specify 'utf-8' encoding when writing to handle non-ASCII characters like Vietnamese names
    with open(output_txt_file_path, "w", encoding='utf-8') as f:
        f.write("First 10 rows of the dataset:\n\n")
        f.write(first_10_rows.to_string())

    print(f"Successfully extracted the first 10 rows and saved to: {output_txt_file_path}")

except FileNotFoundError:
    print(f"Error: The file '{csv_file_path}' was not found. Please ensure the CSV file is in the '{csv_file_folder}' directory relative to main.py.")
except UnicodeEncodeError as e:
    print(f"Error: A character encoding issue occurred when writing the file. This is likely due to non-ASCII characters in the data (e.g., Vietnamese names) and the system's default encoding not supporting them. The code has been modified to explicitly use 'utf-8' encoding. Original error: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")