import sys
import zipfile
import xml.etree.ElementTree as ET
import json
import csv

# Globals for cross-file processing
seen_names = set()
client_name_map = {}
anonymised_counter = 1

def get_column_index(col_letter):
    """ 'A' -> 0, 'B' -> 1, 'Z' -> 25, 'AA' -> 26, etc. """
    index = 0
    for char in col_letter:
        index = index * 26 + (ord(char.upper()) - ord('A') + 1)
    return index - 1

def get_anonymised_name(name):
    global anonymised_counter
    if not name or not isinstance(name, str) or name.strip() == "":
        return name
    name_strip = name.strip()
    # Skip header labels/words
    if name_strip in ["Client Name", "Name", "Guide", "WWE", "Cohort / Program", "Data Entry", "Summary", "Intakes"]:
        return name
    if name_strip not in client_name_map:
        client_name_map[name_strip] = f"Client #{str(anonymised_counter).zfill(3)}"
        anonymised_counter += 1
    return client_name_map[name_strip]

def check_duplicate(name):
    if not name or not isinstance(name, str) or name.strip() == "":
        return
    name_strip = name.strip()
    # Skip header validation
    if name_strip in ["Client Name", "Name", "Guide", "WWE", "Cohort / Program", "Data Entry", "Summary", "Intakes"]:
        return
        
    cleaned_name = name_strip.lower()
    if cleaned_name in seen_names:
        raise ValueError(f"Duplicate client name detected across files: '{name_strip}'")
    seen_names.add(cleaned_name)


def parse_csv(file_path):
    clients = []
    
    dimension_map = {
        "pwi_life_overall": "Life Overall",
        "pwi_standard_of_living": "Standard of Living",
        "pwi_health": "Health",
        "pwi_achieving_in_life": "Achieving in Life",
        "pwi_personal_relationships": "Personal Relationships",
        "pwi_safety": "Safety",
        "pwi_community": "Community",
        "pwi_future_security": "Future Security",
        "financial_worry": "Financial Worry",
        "self_confidence": "Self-Confidence",
        "voice_agency": "Voice & Agency",
        "work_readiness": "Work Readiness",
        "career_confidence": "Career Confidence",
        "skills_awareness": "Skills Awareness"
    }

    try:
        with open(file_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                client_id = row.get("client_id", "Unknown")
                
                # Validation check
                if client_id != "Unknown":
                    check_duplicate(client_id)
                
                anonymised = get_anonymised_name(client_id) if client_id != "Unknown" else "Unknown"
                
                intake = row.get("intake_number", "")
                cohort = row.get("program", "")
                
                scores = {
                    "Baseline": {},
                    "3mo": {},
                    "6mo": {}
                }
                
                for csv_base, dim_name in dimension_map.items():
                    def parse_val(val_str):
                        if not val_str or val_str.strip() == "":
                            return None
                        try:
                            return float(val_str) if '.' in val_str else int(val_str)
                        except ValueError:
                            return None

                    scores["Baseline"][dim_name] = parse_val(row.get(f"{csv_base}_baseline"))
                    scores["3mo"][dim_name] = parse_val(row.get(f"{csv_base}_3mo"))
                    scores["6mo"][dim_name] = parse_val(row.get(f"{csv_base}_6mo"))
                
                if all(v is None for v in scores["6mo"].values()):
                    scores["6mo"] = None
                    
                clients.append({
                    "id": anonymised,
                    "intakeId": intake,
                    "cohort": cohort,
                    "scores": scores
                })
                
        mock_sheet = [
            ["Intake #", "Client ID", "Cohort / Program", "Life Overall (Base)", "Life Overall (3mo)", "Life Overall (6mo)"]
        ]
        
        for c in clients[:5]:
            base_lo = c['scores']['Baseline'].get('Life Overall', '-')
            m3_lo = c['scores']['3mo'].get('Life Overall', '-')
            m6_lo = '-'
            if c['scores']['6mo']:
                m6_lo = c['scores']['6mo'].get('Life Overall', '-')
            mock_sheet.append([c['intakeId'], c['id'], c['cohort'], base_lo, m3_lo, m6_lo])
            
        parsed_sheets = {
            "Data Entry (CSV)": mock_sheet
        }

        return {
            "clients": clients,
            "sheets": parsed_sheets
        }
    except Exception as e:
        raise Exception(f"CSV Parse error: {str(e)}")

def parse_xlsx(file_path):
    dimensions = [
      "Life Overall", "Standard of Living", "Health", "Achieving in Life",
      "Personal Relationships", "Safety", "Community", "Future Security",
      "Financial Worry", "Self-Confidence", "Voice & Agency", "Work Readiness",
      "Career Confidence", "Skills Awareness"
    ]
    
    with zipfile.ZipFile(file_path) as zf:
        # 1. Load shared strings
        shared_strings = []
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        try:
            ss_data = zf.read('xl/sharedStrings.xml')
            ss_root = ET.fromstring(ss_data)
            for si in ss_root.findall('.//ns:si', ns):
                t_elements = si.findall('.//ns:t', ns)
                text = "".join([t.text for t in t_elements if t.text is not None])
                shared_strings.append(text)
        except KeyError:
            pass

        # 2. Get sheet names and relation mapping
        wb_data = zf.read('xl/workbook.xml')
        wb_root = ET.fromstring(wb_data)
        sheets_elems = wb_root.findall('.//ns:sheet', ns)
        
        sheet_names = []
        for s in sheets_elems:
            sheet_names.append(s.attrib.get('name'))

        parsed_sheets = {}
        clients = []

        # 3. Read worksheets
        for sheet_idx, sheet_name in enumerate(sheet_names):
            sheet_file = f"xl/worksheets/sheet{sheet_idx+1}.xml"
            try:
                sheet_data = zf.read(sheet_file)
                sheet_root = ET.fromstring(sheet_data)
                rows_elems = sheet_root.findall('.//ns:row', ns)
                
                sheet_rows = []
                for r in rows_elems:
                    r_idx = int(r.attrib.get('r'))
                    cells = r.findall('ns:c', ns)
                    
                    max_col_idx = -1
                    cell_data = {}
                    
                    for cell in cells:
                        ref = cell.attrib.get('r')
                        col_letter = ''.join([c for c in ref if not c.isdigit()])
                        col_idx = get_column_index(col_letter)
                        max_col_idx = max(max_col_idx, col_idx)
                        
                        cell_type = cell.attrib.get('t')
                        v_elem = cell.find('ns:v', ns)
                        val = v_elem.text if v_elem is not None else None
                        
                        if cell_type == 's' and val is not None:
                            try:
                                val = shared_strings[int(val)]
                            except Exception:
                                pass
                        elif val is not None:
                            try:
                                val = float(val) if '.' in val else int(val)
                            except ValueError:
                                pass
                        cell_data[col_idx] = val
                    
                    # Pad cells to match layout
                    row_list = [cell_data.get(c_idx) for c_idx in range(max_col_idx + 1)]
                    sheet_rows.append(row_list)
                    
                parsed_sheets[sheet_name] = sheet_rows
            except Exception as e:
                parsed_sheets[sheet_name] = [[f"Error loading worksheet: {e}"]]

        # 4. Extract clients from 'Data Entry' tab (usually first sheet, or sheet name 'Data Entry')
        data_entry_rows = parsed_sheets.get('Data Entry')
        if not data_entry_rows:
            # Fallback to first sheet
            data_entry_rows = list(parsed_sheets.values())[0] if parsed_sheets else []

        client_count = 0
        for row_idx, row in enumerate(data_entry_rows):
            # Header starts at row index 5 (which is row 6 in excel)
            if row_idx < 5:
                continue
            if len(row) < 3 or (row[0] is None and row[1] is None):
                continue
            
            real_name = str(row[1]) if row[1] is not None else ""
            
            if real_name:
                # Validation check
                check_duplicate(real_name)
            
            client_count += 1
            
            anonymised_name = get_anonymised_name(real_name) if real_name else f"Client #{str(client_count).zfill(3)}"
            
            intake = str(row[0]) if row[0] is not None else ""
            cohort = str(row[2]) if row[2] is not None else ""
            
            scores = {
                "Baseline": {},
                "3mo": {},
                "6mo": {}
            }
            
            cols = [
                (3, 4, 5, "Life Overall"),
                (6, 7, 8, "Standard of Living"),
                (9, 10, 11, "Health"),
                (12, 13, 14, "Achieving in Life"),
                (15, 16, 17, "Personal Relationships"),
                (18, 19, 20, "Safety"),
                (21, 22, 23, "Community"),
                (24, 25, 26, "Future Security"),
                (27, 28, 29, "Financial Worry"),
                (30, 31, 32, "Self-Confidence"),
                (33, 34, 35, "Voice & Agency"),
                (36, 37, 38, "Work Readiness"),
                (39, 40, 41, "Career Confidence"),
                (42, 43, 44, "Skills Awareness")
            ]
            
            for b_idx, m3_idx, m6_idx, dim in cols:
                b_val = row[b_idx] if b_idx < len(row) else None
                m3_val = row[m3_idx] if m3_idx < len(row) else None
                m6_val = row[m6_idx] if m6_idx < len(row) else None
                
                scores["Baseline"][dim] = b_val if isinstance(b_val, (int, float)) else None
                scores["3mo"][dim] = m3_val if isinstance(m3_val, (int, float)) else None
                scores["6mo"][dim] = m6_val if isinstance(m6_val, (int, float)) else None
            
            all_6mo_null = all(v is None for v in scores["6mo"].values())
            if all_6mo_null:
                scores["6mo"] = None
                
            clients.append({
                "id": anonymised_name,
                "intakeId": intake,
                "cohort": cohort,
                "scores": scores
            })

        # 5. Scan all rows of all preview sheets and apply name anonymisation
        # so that real names are NEVER exposed in the sheet preview tables.
        for s_name, s_rows in parsed_sheets.items():
            for r_idx, row in enumerate(s_rows):
                for c_idx, cell in enumerate(row):
                    if isinstance(cell, str) and cell.strip() in client_name_map:
                        s_rows[r_idx][c_idx] = client_name_map[cell.strip()]

        return {
            "clients": clients,
            "sheets": parsed_sheets
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file paths provided"}))
        sys.exit(1)
        
    file_paths = sys.argv[1:]
    
    all_clients = []
    merged_sheets = {}
    
    try:
        for idx, file_path in enumerate(file_paths):
            if file_path.lower().endswith('.csv'):
                data = parse_csv(file_path)
            else:
                data = parse_xlsx(file_path)
                
            all_clients.extend(data["clients"])
            
            # Merge sheets but avoid name collisions for preview
            for sheet_name, sheet_data in data["sheets"].items():
                merged_key = sheet_name if len(file_paths) == 1 else f"{sheet_name} (File {idx+1})"
                merged_sheets[merged_key] = sheet_data
                
        print(json.dumps({
            "clients": all_clients,
            "sheets": merged_sheets
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
