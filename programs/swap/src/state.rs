use anchor_lang::prelude::*;

#[account]
pub struct SwapPoolConfigAccount {
    pool_config_account_bump: u8,
    pool_token_account_bump: u8,
    token_price: u64,
    token_mint_address: Pubkey,
    pool_token_account: Pubkey,
    pool_config_account: Pubkey,
}

impl SwapPoolConfigAccount {
    pub const LEN: usize =
        8 + //
        1 * 2 + // u8
        8 * 1 + // u64
        3 * 32; // Pubkey
}