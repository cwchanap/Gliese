use gliese_lib::story::check::parse_story_check_args;

fn main() {
    let args = match parse_story_check_args(std::env::args().skip(1)) {
        Ok(args) => args,
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    };

    if let Err(error) = gliese_lib::story::check::run_story_check(
        args.mode,
        args.write_report,
        args.write_generated,
        args.check_generated,
    ) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
