import json

def convert_to_patreon(input_filename, output_filename):
    # Open and read the input file.
    with open(input_filename, "r", encoding="utf-8") as infile:
        content = infile.read()
        print("File content:", content)  # Debug: print the file content
        posts = json.loads(content)  # Use json.loads to decode from the string

    # Wrap the posts in a dictionary (if that’s desired)
    patreon_data = {"posts": posts}
    
    # Write the transformed data to the output file with pretty printing.
    with open(output_filename, "w", encoding="utf-8") as outfile:
        json.dump(patreon_data, outfile, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    input_filename = "input.json"      # Ensure this is the correct path
    output_filename = "patreon.json"     # The output file.
    convert_to_patreon(input_filename, output_filename)
    print(f"Converted {input_filename} to {output_filename}")
