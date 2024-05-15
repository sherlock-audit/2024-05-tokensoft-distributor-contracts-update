import { utils, constants } from "ethers"
import { FormatTypes } from "ethers/lib/utils"
import { readFileSync, readdirSync, writeFileSync, appendFileSync, statSync, existsSync, mkdirSync } from 'fs'
import path, { join } from "path"

/**
 * Scans all compiled solidity artifacts and generates interface IDs for every interface found.
 */

// legacy interfaces that are manually saved here
const legacyInterfaces = {
	IDistributor: '0xab85ea0e',
	AdvancedDistributor: '0xfc57b782',
	IContinuousVesting: '0x09e04257',
	IMerkleSet: '0x35ef410e'
}

// Gets the ERC-165 interface ID for any Interface: see https://eips.ethereum.org/EIPS/eip-165
export function getInterfaceId(contractInterface: utils.Interface): string {
	return Object.values(contractInterface.functions).reduce(
		(acc, fn) => acc.xor(contractInterface.getSighash(fn)),
		constants.Zero
	).toHexString()
}

// get an abi from a JSON file
export function loadAbi(filepath: string): any {
	return JSON.parse(readFileSync(filepath).toString()).abi
}

// save an abi to a JSON file
function saveAbi(abi: any, filepath: string) {
	const dir = path.parse(filepath).dir

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(filepath, JSON.stringify(abi, null, 2));
}

type InterfaceInfo = {
	[name: string]: {
		source: string
		id: string
	}
}

/**
 * assemblyscript builders
 */
const objectToMap = (obj: { [k: string]: string }) => Object.entries(obj).map(
	([k, v]) => (
		`
    this.set("${k}", "${v}")
    this.set("${v}", "${k}") `
	)
).join('\n')

const keyToGetter = (k: string) => `
  get ${k}(): string {
    let value = this.get("${k}")
	  return value!.toString()
  }`

const objectToAssemblyScriptClass = (name, obj: { [k: string]: string }): string => {
	// workaround for AssemblyScript, which does not support untyped objects: https://www.assemblyscript.org/concepts.html
	return (
		`class ${name}Class extends TypedMap<string, string>{
  constructor(){
	  super()

	  // map interface names to ids AND ids to names
${objectToMap(obj)}
  }

  // convenience getters to emulate an object in AssemblyScript 
${Object.keys(obj).map(k => keyToGetter(k)).join('\n')}
}

export const ${name} = new ${name}Class
`
	)
}



const getFilepaths = (inputDirectory): string[] => {

	const files: string[] = []
	const dirs: string[] = []


	function _getFilepaths(dir: string) {
		try {
			let dirContent = readdirSync(dir);

			dirContent.forEach(path => {

				const fullPath = join(dir, path);

				if (statSync(fullPath).isFile())
					files.push(fullPath);
				else
					dirs.push(fullPath);
			});

			if (dirs.length !== 0)
				_getFilepaths(dirs.pop()!);


		} catch (ex) {
			console.log(ex);
		}
	};
	_getFilepaths(inputDirectory)
	return files
}

const main = async () => {
	const inputDirectory = './artifacts'
	const jsonInterfacesPath = '../subgraph/abis/interfaces.json'
	const assemblyScriptInterfacesPath = '../subgraph/generated/interfaces.ts'
	const abiDirectory = '../subgraph/abis/'

	const info: InterfaceInfo = {}
	const summary: { [name: string]: string } = {}

	console.log(`Copying interfaces ${inputDirectory} to ${abiDirectory}`)
	console.log(`Saving ERC-165 interface IDs for compiled contract ABIs in ${inputDirectory} to ${jsonInterfacesPath} and ${assemblyScriptInterfacesPath}`)

	const filepaths = getFilepaths(inputDirectory)

	for (let filepath of filepaths) {
		try {
			const name = path.parse(filepath).name
			const abi = loadAbi(filepath)

			// some filepaths in these directories do not contain valid abis to build an interface
			if (!abi) continue;

			const iFace = new utils.Interface(abi)
			const id = getInterfaceId(iFace)

			// solidity libraries do not have a meaningful ERC165 interface
			if (id === '0x00') continue;

			info[name] = {
				// get the path of the original solidity
				source: path.dirname(filepath).split(path.sep).slice(1).join(path.sep),
				id
			}
			// simplified info for assemblyscript codegen
			summary[name] = id

			// save the interface abi for the subgraph to use
			const interfacePath = path.join(abiDirectory, path.parse(info[name].source).dir, (path.parse(info[name].source).name + '.json'))
			saveAbi(abi, interfacePath)
		} catch (e) {
			console.error(e)
		}
	}

	writeFileSync(jsonInterfacesPath, JSON.stringify(info, null, 2));

	// uncomment this to see the generated interface ids
	// console.log(`generated interface ids:\n${JSON.stringify(info, null, 2)}`)

	// check a well known interface
	if (summary.IERC20 !== '0x36372b07') throw new Error('the IERC20 interface is incorrect - getInterfaceId() is probably broken!')

	writeFileSync(assemblyScriptInterfacesPath,
		`import { TypedMap } from "@graphprotocol/graph-ts"

// new interfaces
${objectToAssemblyScriptClass('currentInterfaces', summary)}

// legacy interfaces
${objectToAssemblyScriptClass('legacyInterfaces', legacyInterfaces)}
`);
}

main().then(
	() => process.exit(0)
).catch(e => {
	console.error(e);
	process.exit(1);
}
)
