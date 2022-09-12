//deployTwoTables.js

const { ethers, network } = require("hardhat");

const { prepareSqlForTwoTables } = require("./prepareSql");

const { connect } = require("@tableland/sdk");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

globalThis.fetch = fetch;

require("@nomiclabs/hardhat-etherscan");

async function main() {
  const [signer] = await ethers.getSigners();

  const tableland = await connect({ signer, chain: "polygon-mumbai" });

  const mainSchema = `id int primary key, name text, description text, image text`;

  const attributesSchema = `main_id int not null, trait_type text not null, value text`;

  const mainPrefix = "table_nft_main";

  const attributesPrefix = "table_nft_attributes";

  const { name: mainName, txnHash: mainTxnHash } = await tableland.create(
    mainSchema,
    { prefix: mainPrefix }
  );

  let receipt = tableland.receipt(mainTxnHash);

  if (receipt) {
    console.log(`Table '${mainName}' has been created at tx '${mainTxnHash}'`);
  } else {
    throw new Error(
      `Create table error: could not get '${mainName}' transaction receipt: ${mainTxnHash}`
    );
  }

  const { name: attributesName, txnHash: attributesTxnHash } =
    await tableland.create(attributesSchema, { prefix: attributesPrefix });

  receipt = tableland.receipt(attributesTxnHash);

  if (receipt) {
    console.log(
      `Table '${attributesName}' has been created at tx '${attributesTxnHash}'`
    );
  } else {
    throw new Error(
      `Create table error: could not get '${attributesName}' transaction receipt: ${attributesTxnHash}`
    );
  }

  const sqlInsertStatements = await prepareSqlForTwoTables(
    mainName,
    attributesName
  );

  console.log(`\nWriting metadata to tables...`);

  for await (let statement of sqlInsertStatements) {
    const { main, attributes } = statement;

    let { hash: mainWriteTx } = await tableland.write(main);
    receipt = tableland.receipt(mainWriteTx);

    if (receipt) {
      console.log(`${mainName} table: ${main}`);
    } else {
      throw new Error(
        `Write table error: could not get ${mainName} transaction receipt: ${mainWriteTx}`
      );
    }

    for await (let attribute of attributes) {
      let { hash: attrWriteTx } = await tableland.write(attribute);
      receipt = tableland.receipt(attrWriteTx);

      if (receipt) {
        console.log(`${attributesName} table: ${attribute}`);
      } else {
        throw new Error(
          `Table Write Error: Could not get ${attributesName}, hash: ${attrWriteTx}`
        );
      }
    }
  }

  const tablelandBaseURI = `https://testnet.tableland.network/query?mode=list&s=`;

  const TwoTablesNFT = await ethers.getContractFactory("TwoTablesNFT");

  const twoTablesNFT = await TwoTablesNFT.deploy(
    tablelandBaseURI,
    mainName,
    attributesName
  );

  await twoTablesNFT.deployed();

  //testing
  console.log(
    `\nTwoTablesNFT contract deployed on ${network.name} at: ${twoTablesNFT.address}`
  );
  const baseURI = await twoTablesNFT.baseURIString();
  console.log(`TwoTablesNFT is using baseURI: ${baseURI}`);

  const mintToken = await twoTablesNFT.mint();
  const mintTxn = await mintToken.wait();

  const mintReceipient = mintTxn.events[0].args[1];
  const tokenId = mintTxn.events[0].args[2];

  console.log(
    `NFT minted: tokenId '${tokenId.toNumber()}' to owner '${mintReceipient}'`
  );
  const tokenURI = await twoTablesNFT.tokenURI(tokenId);
  console.log(
    `\nSee an example of 'tokenURI' using token '${tokenId}' here:\n${tokenURI}`
  );

  await run("verify:verify", {
    address: twoTablesNFT.address,
    constructorArguments: [tablelandBaseURI, mainName, attributesName],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
