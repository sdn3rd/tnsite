import json
import os

def update_index(index_path, poetry_dir):
    """
    Updates the poetry index with category and tags from individual poem files.

    Args:
        index_path: Path to the index.json file.
        poetry_dir: Path to the directory containing poem folders (e.g., poetry/).

    Returns:
        A dictionary representing the updated index, or None if an error occurs.
    """

    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Index file not found at {index_path}")
        return None
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in index file at {index_path}")
        return None


    updated_index = {}

    for date_folder, poems in index_data.items():
        updated_index[date_folder] = []
        date_path = os.path.join(poetry_dir, date_folder)  # Construct the full path
        if not os.path.isdir(date_path): # Check if the folder exists
            print(f"Warning: Folder {date_folder} not found in {poetry_dir}")
            updated_index[date_folder] = poems # Keep the original entry if folder is missing
            continue

        for poem in poems:
            filename = poem.get("filename")
            if not filename:
                print(f"Warning: No filename found for a poem in {date_folder}")
                updated_index[date_folder].append(poem) # Keep the original entry if filename is missing
                continue

            filepath = os.path.join(date_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as poem_file:
                    poem_data = json.load(poem_file)
                    category = poem_data.get("category")
                    tags = poem_data.get("tags")

                    updated_poem = poem.copy()  # Important: Create a copy to avoid modifying original
                    updated_poem["category"] = category
                    updated_poem["tags"] = tags
                    updated_index[date_folder].append(updated_poem)

            except FileNotFoundError:
                print(f"Warning: Poem file not found at {filepath}")
                updated_index[date_folder].append(poem) # Keep the original entry if file is missing
            except json.JSONDecodeError:
                print(f"Warning: Invalid JSON in poem file at {filepath}")
                updated_index[date_folder].append(poem) # Keep the original entry if file is missing
            except Exception as e: # Catch any other exceptions
                print(f"An unexpected error occurred processing {filepath}: {e}")
                updated_index[date_folder].append(poem)


    return updated_index



# Example usage:
index_file = 'poetry/index.json'
poetry_directory = 'poetry'
new_index_file = 'new_index.json'

updated_data = update_index(index_file, poetry_directory)

if updated_data:
    try:
        with open(new_index_file, 'w', encoding='utf-8') as outfile:
            json.dump(updated_data, outfile, indent=4, ensure_ascii=False)  # Use indent for pretty formatting
        print(f"Updated index saved to {new_index_file}")
    except Exception as e:
        print(f"Error writing to {new_index_file}: {e}")
