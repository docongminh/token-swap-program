use anchor_lang::prelude::*;

#[account]
pub struct PoolConfigAccount {
    pub pool_config_account_bump: u8,
    pub pool_token_account_bump: u8,
    pub pool_native_account_bump: u8,
    pub token_price: u64,
    pub token_mint_address: Pubkey,
    pub pool_token_account: Pubkey,
    pub pool_native_account: Pubkey,
}

impl PoolConfigAccount {
    pub const LEN: usize =
        8 + //
        1 * 3 + // u8
        8 * 1 + // u64
        3 * 32; // Pubkey
}