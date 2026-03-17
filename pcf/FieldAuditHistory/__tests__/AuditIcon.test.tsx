import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuditIcon } from "../components/AuditIcon";

describe("AuditIcon", () => {
    const defaultProps = {
        fieldLogicalName: "emailaddress1",
        fieldDisplayName: "Email",
        tooltip: "View audit history",
        onClick: jest.fn(),
    };

    beforeEach(() => {
        defaultProps.onClick.mockClear();
    });

    it("should render an icon button", () => {
        render(<AuditIcon {...defaultProps} />);

        const button = screen.getByRole("button", { name: /view audit history for email/i });
        expect(button).toBeInTheDocument();
    });

    it("should call onClick with field name and anchor element on click", () => {
        render(<AuditIcon {...defaultProps} />);

        const button = screen.getByRole("button");
        fireEvent.click(button);

        expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
        expect(defaultProps.onClick).toHaveBeenCalledWith(
            "emailaddress1",
            expect.any(HTMLElement)
        );
    });

    it("should stop event propagation on click", () => {
        const parentClick = jest.fn();

        render(
            <div onClick={parentClick}>
                <AuditIcon {...defaultProps} />
            </div>
        );

        const button = screen.getByRole("button");
        fireEvent.click(button);

        expect(defaultProps.onClick).toHaveBeenCalled();
        expect(parentClick).not.toHaveBeenCalled();
    });

    it("should have accessible aria-label", () => {
        render(<AuditIcon {...defaultProps} />);

        const button = screen.getByRole("button");
        expect(button).toHaveAttribute("aria-label", "View audit history for Email");
    });

    it("should render with different field names", () => {
        render(
            <AuditIcon
                {...defaultProps}
                fieldLogicalName="telephone1"
                fieldDisplayName="Phone"
            />
        );

        const button = screen.getByRole("button", { name: /phone/i });
        expect(button).toBeInTheDocument();

        fireEvent.click(button);
        expect(defaultProps.onClick).toHaveBeenCalledWith("telephone1", expect.any(HTMLElement));
    });
});
