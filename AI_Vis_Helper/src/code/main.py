import pandas as pd
import os
import matplotlib.pyplot as plt
import seaborn as sns

# 1. Định nghĩa đường dẫn đến file CSV
csv_file_name = "data.csv"
csv_file_folder = "data"

# Xác định thư mục của script hiện tại
current_dir = os.path.dirname(os.path.abspath(__file__))

# Xây dựng đường dẫn tuyệt đối đến file CSV
csv_file_path = os.path.join(current_dir, '..', csv_file_folder, csv_file_name)

# Định nghĩa ánh xạ toàn diện từ tên cột CSV thực tế sang tên nội bộ mong muốn
# Các key phải là tên cột chính xác như trong CSV (không có BOM cho tra cứu, nhưng được lưu đúng để đổi tên)
column_name_map = {
    'Mã_khách_hàng': 'id',
    'Giới tính': 'gender',
    'Tuổi': 'age',
    'Nghề_nghiệp': 'occupation',
    'Số_dư': 'balance',
    'Thu_nhập_hàng_tháng': 'monthly_ir',
    'Địa_chỉ': 'address',
    'Tình_trạng_hôn_nhân': 'married',
    'Số_thẻ': 'nums_card',
    'Số_lần_dùng_dịch_vụ': 'nums_service',
    'Trạng_thái_hoạt_động_trong_90_ngày_gần_nhất': 'active_member',
    'Ngày_hoạt_động_gần_nhất': 'last_active_date',
    'Giao_dịch_tháng_gần_nhất': 'last_transaction_month',
    'Ngày_tạo_tài_khoản': 'created_date',
    'Trạng_thái_rời_bỏ': 'exit',
    'Phân_khúc_khách_hàng': 'customer_segment',
    'Điểm_tín_dụng': 'credit_sco',
    'Điểm_tương_tác': 'engagement_score',
    'Mức_độ_trung_thành': 'loyalty_level',
    'Hành_vi_số_hóa': 'digital_behavior',
}

try:
    # 2. Đọc file CSV vào DataFrame, chỉ định encoding 'utf-8' để xử lý ký tự tiếng Việt
    df = pd.read_csv(csv_file_path, encoding='utf-8')

    # Khởi tạo từ điển để đổi tên các cột thực sự có trong DataFrame
    rename_columns_dict = {}
    for col in df.columns:
        # Xóa ký tự BOM (ufeff) tiềm ẩn khỏi tên cột để tra cứu
        clean_col_for_lookup = col.replace('\ufeff', '')
        if clean_col_for_lookup in column_name_map:
            # Sử dụng tên cột gốc (có thể có BOM) làm key cho df.rename
            rename_columns_dict[col] = column_name_map[clean_col_for_lookup]
        else:
            rename_columns_dict[col] = col # Giữ tên gốc nếu không tìm thấy ánh xạ

    # Đổi tên các cột trong DataFrame
    df.rename(columns=rename_columns_dict, inplace=True)
    
    # Kiểm tra xem các cột cần thiết có tồn tại sau khi đổi tên hay không
    required_cols_for_q3 = ['age', 'gender']
    if not all(col in df.columns for col in required_cols_for_q3):
        raise ValueError(f"Error: One or more required columns ({required_cols_for_q3}) not found after renaming. Please check data and mapping.")

    # --- Bắt đầu Trực quan hóa Biểu đồ cho Câu hỏi 3 ---    
    # Câu hỏi 3: Phân tích tổng số khách hàng theo nhóm tuổi và giới tính để xác định
    # các phân khúc nhân khẩu học chính cho các sản phẩm tùy chỉnh vào cuối Q3.

    # Định nghĩa các khoảng tuổi và nhãn cho việc nhóm, theo yêu cầu của câu hỏi
    # Bins: 18-35, 36-55, 56-75, 76+ (đến 100). Sử dụng 101 để bao gồm tuổi 100 với right=False.
    bins_q3 = [18, 36, 56, 76, 101]
    labels_q3 = ['18-35 (Young Adult)', '36-55 (Middle Age)', '56-75 (Senior)', '76+ (Elderly)']

    # Tạo cột 'age_group_q3' mới dựa trên các khoảng tuổi đã định nghĩa
    df['age_group_q3'] = pd.cut(df['age'], bins=bins_q3, labels=labels_q3, right=False, ordered=True)

    # Tính toán tổng số khách hàng cho mỗi nhóm tuổi và giới tính
    df_customer_counts = df.groupby(['age_group_q3', 'gender']).size().unstack(fill_value=0)

    # Đảm bảo tất cả các nhãn nhóm tuổi đều có trong dữ liệu tổng hợp, điền 0 nếu không có
    # Điều này giúp duy trì thứ tự nhất quán trong biểu đồ
    df_customer_counts = df_customer_counts.reindex(labels_q3, fill_value=0)

    # Chuẩn bị dữ liệu cho biểu đồ tháp: số lượng khách hàng của Nam sẽ là số âm để vẽ sang bên trái
    # Đảm bảo các cột 'Nam' và 'Nữ' tồn tại với giá trị 0 nếu không có dữ liệu
    if 'Nam' not in df_customer_counts.columns:
        df_customer_counts['Nam'] = 0
    if 'Nữ' not in df_customer_counts.columns:
        df_customer_counts['Nữ'] = 0

    male_counts = -df_customer_counts['Nam'] # Biểu diễn số lượng khách hàng Nam bằng giá trị âm
    female_counts = df_customer_counts['Nữ'] # Giữ số lượng khách hàng Nữ bằng giá trị dương
    age_groups_for_plot_q3 = df_customer_counts.index

    # Tạo hình và trục cho biểu đồ tháp
    fig, axes = plt.subplots(figsize=(12, 8))

    # Vẽ dữ liệu của Nam (bên trái)
    axes.barh(age_groups_for_plot_q3, male_counts, color='skyblue', label='Nam', align='center')

    # Vẽ dữ liệu của Nữ (bên phải)
    axes.barh(age_groups_for_plot_q3, female_counts, color='salmon', label='Nữ', align='center')

    # Đặt tiêu đề và nhãn
    axes.set_title('Tổng số khách hàng theo nhóm tuổi và giới tính', fontsize=16)
    axes.set_xlabel('Số lượng khách hàng', fontsize=12)
    axes.set_ylabel('Nhóm tuổi', fontsize=12)

    # Tùy chỉnh các điểm đánh dấu trên trục x để hiển thị giá trị tuyệt đối
    # Tính giá trị tuyệt đối tối đa để thiết lập giới hạn x đối xứng
    max_abs_count = max(male_counts.abs().max(), female_counts.max())
    axes.set_xlim(-max_abs_count * 1.1, max_abs_count * 1.1) # Thêm một chút khoảng trống

    # Định dạng nhãn trục x để hiển thị giá trị dương
    formatter = plt.FuncFormatter(lambda x, p: f'{abs(int(x))}') # Hiển thị số nguyên dương
    axes.xaxis.set_major_formatter(formatter)

    # Thêm chú giải để phân biệt giới tính
    axes.legend(title='Giới tính')

    # Thêm lưới để dễ đọc hơn
    axes.grid(axis='x', linestyle='--', alpha=0.7)

    # Điều chỉnh bố cục để tránh chồng lấn nhãn
    plt.tight_layout()

    # Định nghĩa đường dẫn file đồ thị
    graph_file_name_q3 = "q3.png" # Cập nhật tên file theo yêu cầu
    graph_file_folder_q3 = "assets"
    graph_output_path_q3 = os.path.join(current_dir, '..', graph_file_folder_q3, graph_file_name_q3)

    # Đảm bảo thư mục assets tồn tại
    os.makedirs(os.path.dirname(graph_output_path_q3), exist_ok=True)

    # Lưu biểu đồ đã tạo dưới dạng ảnh PNG
    plt.savefig(graph_output_path_q3)
    plt.close() # Đóng biểu đồ để giải phóng bộ nhớ

    # Cập nhật thông báo console để tránh lỗi unicode
    print(f"Chart for Q3 saved to: {graph_output_path_q3}")
    # --- Kết thúc Trực quan hóa Biểu đồ cho Câu hỏi 3 ---

except FileNotFoundError:
    print(f"Error: CSV file '{csv_file_path}' not found. Please ensure the CSV file is in the '{csv_file_folder}' directory relative to main.py.")
except ValueError as ve:
    print(f"Data error: {ve}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
