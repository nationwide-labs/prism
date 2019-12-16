export class Command {
    id: string;
    name: string;
    description: string;
    options: CommandOption[];
    isEnabled: boolean;
    isHelpEnabled: boolean;

    public codeFile: string;
    public folder: string;

    normalize() {
        let options: CommandOption[] = [];
        try {
            for (let i = 0; i < this.options.length; i++) {
                let option = new CommandOption();
                Object.assign(option, this.options[i]);
                options.push(option);
            }
        } catch (err) { }
        this.options = options;
    }
}

export class CommandOption {
    id: string;
    flags: string;
    description: string;
    defaultValue: string;
}
