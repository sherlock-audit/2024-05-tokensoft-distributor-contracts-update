// SPDX-License-Identifier: MIT
pragma solidity =0.8.21;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./FlatPriceSale.sol";

contract FlatPriceSaleFactory {
	address public immutable implementation;
	string public constant VERSION = "2.0";

	event NewSale(
		address indexed implementation,
		FlatPriceSale indexed clone,
		Config config,
		string baseCurrency,
		IOracleOrL2OracleWithSequencerCheck nativeOracle,
		bool nativePaymentsEnabled
	);

	constructor(address _implementation) {
		implementation = _implementation;
	}

	function newSale(
		address _owner,
		Config calldata _config,
		string calldata _baseCurrency,
		bool _nativePaymentsEnabled,
		IOracleOrL2OracleWithSequencerCheck _nativeTokenPriceOracle,
		IERC20Upgradeable[] calldata tokens,
		IOracleOrL2OracleWithSequencerCheck[] calldata oracles,
		uint8[] calldata decimals
	) external returns (FlatPriceSale sale) {
		sale = FlatPriceSale(Clones.clone(address(implementation)));

		emit NewSale(
			implementation,
			sale,
			_config,
			_baseCurrency,
			_nativeTokenPriceOracle,
			_nativePaymentsEnabled
		);

		sale.initialize(
			_owner,
			_config,
			_baseCurrency,
			_nativePaymentsEnabled,
			_nativeTokenPriceOracle,
			tokens,
			oracles,
			decimals
		);
	}
}
