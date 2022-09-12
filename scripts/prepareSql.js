//prepareSql.js

const prepareMetadata = require("./metadataProcessing")
const dotenv = require("dotenv")
dotenv.config()    //dot env lets us read our .env file (things we dont want public)

// /* main */
// id int primary key, name text, description text, image text
// /* attributes */
// main_id int not null, trait_type text not null, value text      ///// these are the SQL schemas that we're using to create our two tables
                                                                    //// Which will later be combined and referenced as ERC721 compliant metadata


async function prepareSqlForTwoTables(mainTable, attributesTable) {
    const metadata = await prepareMetadata()


    const sqlInsertStatements = [] // this will be the array of statement objects, one for every token 


    for await (let obj of metadata) {
        const {id, name, description, image, attributes} = obj  //destructuring the array of metadata objects returned by prepareMetadata

        let mainTableStatement = `INSERT INTO ${mainTable} (id, name, description, image) VALUES (${id}, '${name}', '${description}', '${image}');` 
        //this prepares the metadata to be passed into our table in native SQL syntax
        
        const attributesTableStatements = []
        for await (let attribute of attributes){  //this loops through the attributes object we get when we destructure it from the metadata object
            const {trait_type, value} = attribute 

            const attributesStatement = `INSERT INTO ${attributesTable} (main_id, trait_type, value) VALUES (${id}, '${trait_type}', '${value}');`
            //this prepares the insert statements for the attributes table, then wil append the statement to an array that holds the insert statements for all metadata objects
            attributesTableStatements.push(attributesStatement)
        }

        const statement = {
            main: mainTableStatement,
            attributes: attributesTableStatements,
        }

        sqlInsertStatements.push(statement)
    }

    return sqlInsertStatements
}


module.exports = {prepareSqlForTwoTables}

//pick back up where you left off! : https://docs.tableland.xyz/deploying-an-nft-on-polygon
