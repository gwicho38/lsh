import argparse
import pandas as pd
import datetime
import warnings

warnings.simplefilter(action='ignore', category=UserWarning)

def generate_file_name():
    today = datetime.datetime.today()
    return '_'.join(['Engineers_To_Review', today.strftime("%Y"), today.strftime("%b")])

## 0. Change this to where you have the staffing sheet saved!
FILEPATH = ''

SHEET_NAME = 'Detailed_Staffing'
OUTPUT_LOC = '~/Desktop'
OUTPUT_FILE = generate_file_name()

ASE = 'Associate Solution Engineer'
SE = 'Solution Engineer'
SR = 'Senior Solution Engineer'
MGR = 'Manager, Solution Engineering'

def generate_reviewer_file(input_fp, input_sheet, output_loc, output_fn):
    reviewers = []
    
    ## 1. Read staffing spreadsheet; rename columns
    print("Reading staffing sheet at: " + input_fp + " ...")
    detailed_staffing_df = pd.read_excel(input_fp, sheet_name=input_sheet)
    detailed_staffing_df = detailed_staffing_df.rename(columns={
        'Resource\n(Input Required)': 'Resource',
        'Project\n(Input Required)' : 'Project',
        'Project DM/SL Name'  : 'DM_SL_Name',
        'Project DM/SL Email' : 'DM_SL_Email',
        'Resource Email'      : 'Resource_Email',
        'Supervisor Email'    : 'Manager_Email',
        'Manager / \nThird Party Company' : 'Manager',
    })

    ## 2. Collect list of Active SEs
    detailed_staffing_df = detailed_staffing_df[detailed_staffing_df['Status']=='Active'] 
    customer_engineers_df = detailed_staffing_df[detailed_staffing_df['Department'] == 'Customer Engineering']
    print("Staffing sheet read successfully!")

    ## 3. Iterate through SEs and identify collaborators
    print("Finding SE Collaborators...")
    for se_row in customer_engineers_df.itertuples():
        engineer = getattr(se_row, 'Resource')
        title = getattr(se_row, 'Title')
        manager = getattr(se_row, 'Manager')
        manager_email = getattr(se_row, 'Manager_Email')
        project = getattr(se_row, 'Project')
        dm_sl = getattr(se_row, 'DM_SL_Name')
        dm_sl_email = getattr(se_row, 'DM_SL_Email')

        reviewers.append({
            'SE': engineer,
            'Title': title,
            'Manager': manager,
            'Manager Email': manager_email,
            'Reviewer': dm_sl,
            'Reviewer Email': dm_sl_email,
            # 'Reviewer Role': 'DM/SL',
            'Project': project,
        })

        ## Get others on the project who are not the engineer, associates, or contractors
        collaborators_df = detailed_staffing_df[
            (detailed_staffing_df['Project'] == project) &
            (detailed_staffing_df['Resource'] != engineer) &
            (detailed_staffing_df['Department'] != 'Third Party') &
            (detailed_staffing_df['Title'] != ASE)
        ]

        ## For bigger teams:    
        if len(collaborators_df) > 3:
            ## -> Directors & Architects need not review juniors
            if title == ASE or title == SE:
                collaborators_df = collaborators_df[
                    ~collaborators_df['Title'].str.contains('Director') &
                    ~collaborators_df['Title'].str.contains('Architect')
                ]
            
            ## -> DEs need not review seniors / leads
            elif title == SR or title == MGR:
                collaborators_df = collaborators_df[
                    ~collaborators_df['Title'].str.contains('Data Engineer')
                ]
            ## -> OTHER RULES CAN GO HERE ...

        ## Save reviewers to list
        for collaborator_row in collaborators_df.itertuples():
            reviewer = getattr(collaborator_row, 'Resource')
            reviewer_email = getattr(collaborator_row, 'Resource_Email')
            reviewers.append({
                'SE': engineer,
                'Title': title,
                'Manager': manager,
                'Manager Email': manager_email,
                'Reviewer': reviewer,
                'Reviewer Email': reviewer_email,
                'Project': project,
            })

    ## 4. Finalize & filter output
    print("Generating output file...")
    output_df = pd.DataFrame(reviewers).drop_duplicates()
    # Downsample to a maximum of 3 reviewers
    output_df = output_df.groupby('SE', group_keys=False).apply(lambda df: df.sample(3, replace=True))
    # If reviewers are originally <1, then sample will create duplicates up to 3
    output_df = pd.DataFrame(reviewers).drop_duplicates()
    output_df = output_df[output_df['Reviewer'] != 'OA Admin']
    output_df = output_df[output_df['Project'] != 'Internal: Operations & Management']

    ## 5. Write reviewer list to file
    output_fp = output_loc + '/' + output_fn + '.xlsx'
    output_df.to_excel(output_fp, index=False)
    print("Output file ready! Available at: " + output_fp)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Automatically generate monthly reviewers for SE team')

    parser.add_argument('-fp', '--filepath',
                        dest='filepath',
                        help='reachable filepath for the staffing file. Default: ' + FILEPATH,
                        default=FILEPATH)
    parser.add_argument('-o', '--output-dir',
                        dest='output',
                        help='directory to write output file. Default: ' + OUTPUT_LOC,
                        default=OUTPUT_LOC)
    parser.add_argument('-n', '--output-name',
                        dest='name',
                        help='name of output file. Default: Engineers_To_Review_YYYY_MM',
                        default = OUTPUT_FILE)

    args = parser.parse_args()
    generate_reviewer_file(input_fp=args.filepath, input_sheet=SHEET_NAME, output_loc=args.output, output_fn=args.name)