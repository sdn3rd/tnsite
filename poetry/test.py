import os
import json

def create_index_json(root_dir, output_filename="index.json"):
    """
    Recursively crawls directories from root_dir, processes JSON files,
    and creates an index.json file with extracted title_en, title_it, and filenames.
    Enhanced logging for debugging.

    Args:
        root_dir (str): The root directory to start crawling from.
        output_filename (str, optional): The name of the output JSON file. Defaults to "index.json".
    """

    index_data = {}

    print(f"Starting directory crawl from: {root_dir}") # Log root directory

    for dirpath, dirnames, filenames in os.walk(root_dir):
        directory_name = os.path.basename(dirpath)  # Get the current directory name
        date_dir_name = directory_name # Assume directory name is the date

        print(f"\nProcessing directory: {dirpath}") # Log directory being processed
        print(f"  Subdirectories: {dirnames}") # Log subdirectories found (should be empty in our case)
        print(f"  Filenames: {filenames}") # Log filenames found

        if date_dir_name not in index_data:
            index_data[date_dir_name] = []

        for filename in filenames:
            if filename.endswith(".json"):
                filepath = os.path.join(dirpath, filename)
                print(f"  Processing JSON file: {filepath}") # Log JSON file being processed
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        json_content = json.load(f)
                        print(f"    JSON content successfully loaded from: {filename}") # Log successful load

                    title_en = json_content.get("title_en", json_content.get("title", "tbd")) # Fallback to "title" if title_en is missing, then "tbd"
                    title_it = json_content.get("title_it", "tbd") # Default to "tbd" if title_it is missing

                    index_data[date_dir_name].append({
                        "filename": filename,
                        "title_en": title_en,
                        "title_it": title_it
                    })
                    print(f"    Extracted data: filename='{filename}', title_en='{title_en}', title_it='{title_it}'") # Log extracted data

                except json.JSONDecodeError:
                    print(f"  Warning: Could not decode JSON in file: {filepath}. Skipping.") # Keep warning log
                except Exception as e:
                    print(f"  Error processing file: {filepath}. Error: {e}") # Keep error log

    # Remove empty date directories from index if no JSON files found in them
    directories_to_remove = [date for date, files in index_data.items() if not files]
    for date_dir in directories_to_remove:
        del index_data[date_dir]


    try:
        with open(output_filename, 'w', encoding='utf-8') as outfile:
            json.dump(index_data, outfile, indent=4, ensure_ascii=False)
        print(f"\nIndex JSON created successfully: {output_filename}")
    except Exception as e:
        print(f"Error writing to {output_filename}: {e}")


if __name__ == "__main__":
    root_directory = '.'  # <---- IMPORTANT: Changed root_directory to '.' (current directory) assuming date dirs are here
    create_index_json(root_directory)
