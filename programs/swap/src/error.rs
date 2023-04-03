use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("user insufficient funds")]
    InsufficientFunds,

    #[msg("token account insufficient funds")]
    TokenAccountInsufficientFunds,

    #[msg("Account invalid type expect")]
    InvalidAccount
}