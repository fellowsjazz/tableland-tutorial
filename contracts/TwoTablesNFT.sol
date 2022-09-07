// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Import this file to use console.log



// *** I REALLY NEED TO DIG INTO THE STUFF I DON'T UNDERSTAND ON THIS CONTRACT***** come back to it , pleaseeee future Russ

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TwoTablesNFT is ERC721 {
    string public baseURIString;

    string public mainTable;

    string public attributesTable;

    uint256 private _tokenIdCounter;

    uint256 private _maxTokens;

    constructor(
        string memory baseURI,
        string memory _mainTable,
        string memory _attributesTable
    ) ERC721("TwoTablesNFT", "TTNFT") {
        // Initialize with token counter at zero
        _tokenIdCounter = 0;
        // The max number of NFTs in this tutorial
        _maxTokens = 2;
        // Set the baseURI to the Tableland gateway
        baseURIString = baseURI;
        // Set the table names
        mainTable = _mainTable;
        attributesTable = _attributesTable;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURIString;
    }

    function totalSupply() public view returns (uint256) {
        return _maxTokens;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();

        if (bytes(baseURI).length == 0) {
            return "";
        }

        string memory query = string(
            abi.encodePacked(
                "SELECT%20json_object%28%27id%27%2Cid%2C%27name%27%2Cname%2C%27description%27%2Cdescription%2C%27attributes%27%2Cjson_group_array%28json_object%28%27trait_type%27%2Ctrait_type%2C%27value%27%2Cvalue%29%29%29%20FROM%20",
                mainTable,
                "%20JOIN%20",
                attributesTable,
                "%20ON%20",
                mainTable,
                "%2Eid%20%3D%20",
                attributesTable,
                "%2Emain_id%20WHERE%20id%3D"
            )
        );

        // This is the SQL query that joins the two tables. Without the % formatting, it looks like this:
        /*

SELECT json_object(
    'id', id, 
    'name', name, 
    'description', description, 
    'attributes', json_group_array(
      json_object(
        'trait_type',trait_type,
        'value', value
      )
    )
  ) 
FROM {mainTable} JOIN {attributesTable}
    ON {mainTable}.id = {attributesTable}.main_id 
WHERE id = <main_id> 
GROUP BY id
            */

        return string(abi.encodePacked(baseURI, "&mode=list", query, Strings.toString(tokenId), "%20group%20by%20id"));


    }

    function mint() public {
        require(_tokenIdCounter < _maxTokens, "Max token amount reached");
        _safeMint(msg.sender, _tokenIdCounter);
        _tokenIdCounter++;
    }
}
