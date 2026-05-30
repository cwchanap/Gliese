use gliese_lib::story::check::CheckMode;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let strict = args.iter().any(|arg| arg == "--mode=strict");
    let write_report = args.iter().any(|arg| arg == "--write-report");
    let write_generated = args.iter().any(|arg| arg == "--write-generated");
    let check_generated = args.iter().any(|arg| arg == "--check-generated");

    if let Err(error) = gliese_lib::story::check::run_story_check(
        if strict {
            CheckMode::Strict
        } else {
            CheckMode::Draft
        },
        write_report,
        write_generated,
        check_generated,
    ) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
