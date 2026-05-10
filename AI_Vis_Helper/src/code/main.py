import pandas as pd
import os

# --- PATH-001 & PATH-002: Determine absolute path to data folder ---
current_dir = os.path.abspath(os.path.dirname(__file__))
data_dir = os.path.join(current_dir, '..', 'data')

# Define the expected data file name
data_file_name = 'banking_customer_data.csv' # <<< CHANGE THIS IF YOUR FILE NAME IS DIFFERENT
data_path = os.path.join(data_dir, data_file_name)

# --- RULE-002: Notify if data not found/loaded ---
try:
    # Load the dataset
    df = pd.read_csv(data_path)
    print(f"Dữ liệu từ '{data_file_name}' đã được tải thành công từ đường dẫn: {data_path}\n")

    # --- TASK-001: General Analysis (records, types, distributions) ---
    print("--- 1. 5 dòng dữ liệu đầu tiên ---")
    print(df.head())
    print("\n")

    print("--- 2. Thông tin tổng quan về dữ liệu (kiểu dữ liệu, số lượng non-null) ---")
    df.info()
    print("\n")

    print("--- 3. Kích thước tập dữ liệu (số hàng, số cột) ---")
    print(f"Tập dữ liệu có {df.shape[0]} hàng và {df.shape[1]} cột.\n")

    print("--- 4. Thống kê mô tả cho các cột số ---")
    print(df.describe())
    print("\n")

    print("--- 5. Kiểm tra giá trị thiếu ---")
    missing_values = df.isnull().sum()
    missing_values_percentage = (df.isnull().sum() / len(df)) * 100
    missing_df = pd.DataFrame({'Missing Count': missing_values, 'Percentage (%)': missing_values_percentage})
    print(missing_df[missing_df['Missing Count'] > 0])
    if missing_df[missing_df['Missing Count'] > 0].empty:
        print("Không có giá trị thiếu nào trong tập dữ liệu.\n")
    print("\n")

    print("--- 6. Phân phối các giá trị duy nhất cho các cột phân loại (object/category) ---")
    for column in df.select_dtypes(include=['object', 'category']).columns:
        print(f"Phân phối của cột '{column}':")
        print(df[column].value_counts())
        print("\n")

except FileNotFoundError:
    print(f"LỖI: Không tìm thấy file dữ liệu '{data_file_name}' tại đường dẫn: {data_path}")
    print("Vui lòng đảm bảo file dữ liệu của bạn nằm trong thư mục 'src/data/' và có tên chính xác.\n")
except Exception as e:
    print(f"Đã xảy ra lỗi khi tải hoặc phân tích dữ liệu: {e}\n")
